import React, {useState, useEffect, useContext} from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TestService from '../services/TestService';
import {AuthContext} from "../context/AuthContext.jsx";

const TestForm = () => {
    const { testId } = useParams();
    const navigate = useNavigate();
    const isEditing = !!testId;


    const [formData, setFormData] = useState({
        title: '',
        description: '',
        subjectId: '',
        timeLimit: 60,
        gradeIds: [],
        questions: [],
        maxAttempts: 1,         // Added maxAttempts field
        questionsToShow: null   // Added questionsToShow field
    });

    const [subjects, setSubjects] = useState([]);
    const [grades, setGrades] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { user } = useContext(AuthContext);
    const isAdmin = user && user.role === 'ADMIN';

    useEffect(() => {
        const fetchSubjectsAndGrades = async () => {
            try {
                setLoading(true);

                // Load subjects and classes depending on user role
                if (isAdmin) {
                    // For administrator, load all subjects and classes
                    const subjectsResponse = await TestService.getAllSubjects();
                    const gradesResponse = await TestService.getAllGrades();

                    setSubjects(Array.isArray(subjectsResponse) ? subjectsResponse : subjectsResponse.subjects || []);
                    setGrades(Array.isArray(gradesResponse) ? gradesResponse : gradesResponse.grades || []);
                } else {
                    // For regular teachers, use the existing endpoint
                    const response = await TestService.getTeacherSubjectsAndGrades();

                    console.log('Teacher subjects and grades response:', response);

                    setSubjects(response.subjects || []);
                    setGrades(response.grades || []);
                }
            } catch (err) {
                setError("Ошибка при загрузке данных: " + (err.message || 'Произошла ошибка'));
            } finally {
                setLoading(false);
            }
        };

        fetchSubjectsAndGrades();
    }, [isAdmin]);

    useEffect(() => {
        if (isEditing) {
            const fetchTest = async () => {
                try {
                    setLoading(true);
                    const response = await TestService.getTestById(testId, true);
                    const testData = response.data || response;

                    console.log('Test data for editing:', testData);

                    if (!testData.questions || testData.questions.length === 0) {
                        setError("У вас нет доступа к редактированию вопросов этого теста");
                        navigate('/tests');
                        return;
                    }

                    // Обработка классов
                    let gradeIds = [];
                    if (testData.availableGrades) {
                        gradeIds = testData.availableGrades.map(grade => {
                            if (typeof grade === 'number') return grade;
                            if (typeof grade === 'string') {
                                // Предполагаем, что строка — это fullName, ищем соответствующий id
                                const matchingGrade = grades.find(g => g.fullName === grade || g.name === grade);
                                return matchingGrade ? matchingGrade.id : null;
                            }
                            if (typeof grade === 'object' && grade !== null && grade.id) return grade.id;
                            return null;
                        }).filter(id => id !== null);
                    }

                    console.log('Processed grade IDs:', gradeIds);

                    setFormData({
                        title: testData.title,
                        description: testData.description || '',
                        subjectId: testData.subject?.id || testData.subjectId,
                        timeLimit: testData.timeLimit || 60,
                        gradeIds: gradeIds,
                        questions: (testData.questions || []).map(q => {
                            if (q.type === 'TEXT_ANSWER' && (!q.answers || q.answers.length === 0)) {
                                return {
                                    ...q,
                                    answers: [{ text: '', isCorrect: true }]
                                };
                            }
                            return q;
                        }),
                        maxAttempts: testData.maxAttempts || 1,
                        questionsToShow: testData.questionsToShow || null
                    });
                } catch (err) {
                    const errorMsg = err.response?.data?.message || err.message;
                    setError("Ошибка при загрузке теста: " + errorMsg);
                    if (err.response?.status === 401 || err.response?.status === 403) {
                        navigate('/tests');
                    }
                } finally {
                    setLoading(false);
                }
            };

            fetchTest();
        }
    }, [testId, isEditing, navigate, grades]); // Добавляем grades в зависимости

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };


    const handleGradeChange = (e) => {
        const gradeId = parseInt(e.target.value);
        const isChecked = e.target.checked;

        setFormData(prev => {
            const currentGradeIds = [...prev.gradeIds];

            let updatedGradeIds;
            if (isChecked) {
                // Always add as a number, not a string
                updatedGradeIds = [...currentGradeIds, gradeId];
            } else {
                // Remove the ID whether it's a number or matching string
                updatedGradeIds = currentGradeIds.filter(id => {
                    if (typeof id === 'number') return id !== gradeId;
                    if (typeof id === 'string' && !isNaN(parseInt(id))) return parseInt(id) !== gradeId;

                    // For string names, check if this grade's name/fullName matches
                    const matchedGrade = grades.find(g => g.id === gradeId);
                    return id !== matchedGrade?.name && id !== matchedGrade?.fullName;
                });
            }

            return {
                ...prev,
                gradeIds: updatedGradeIds
            };
        });
    };
    const isGradeSelected = (grade) => {
        // Check if this grade's ID is in our gradeIds array (as number)
        if (formData.gradeIds.includes(grade.id)) {
            return true;
        }

        // Check if this grade's ID is in our gradeIds array (as string)
        if (formData.gradeIds.includes(String(grade.id))) {
            return true;
        }

        // Check if this grade's name or fullName is in our gradeIds array
        if (formData.gradeIds.includes(grade.name) || formData.gradeIds.includes(grade.fullName)) {
            return true;
        }

        // For numeric ID stored as strings
        const numericIds = formData.gradeIds
            .filter(id => typeof id === 'string')
            .map(id => parseInt(id))
            .filter(id => !isNaN(id));

        if (numericIds.includes(grade.id)) {
            return true;
        }

        // Not found in any format
        return false;
    };

    const handleQuestionChange = (index, field, value) => {
        const updatedQuestions = [...formData.questions];
        updatedQuestions[index] = {
            ...updatedQuestions[index],
            [field]: value
        };

        // If changing type to TEXT_ANSWER, ensure we have correct answer structure
        if (field === 'type' && value === 'TEXT_ANSWER') {
            updatedQuestions[index].answers = [{
                text: updatedQuestions[index].answers?.[0]?.text || '',
                isCorrect: true
            }];
        }

        setFormData(prev => ({
            ...prev,
            questions: updatedQuestions
        }));
    };

    const handleAnswerChange = (questionIndex, answerIndex, field, value) => {
        const updatedQuestions = [...formData.questions];

        // Ensure answers array exists
        if (!updatedQuestions[questionIndex].answers) {
            updatedQuestions[questionIndex].answers = [];
        }

        // Ensure the specific answer exists
        if (!updatedQuestions[questionIndex].answers[answerIndex]) {
            updatedQuestions[questionIndex].answers[answerIndex] = { text: '', isCorrect: false };
        }

        updatedQuestions[questionIndex].answers[answerIndex] = {
            ...updatedQuestions[questionIndex].answers[answerIndex],
            [field]: value
        };

        setFormData(prev => ({
            ...prev,
            questions: updatedQuestions
        }));
    };

    const addQuestion = () => {
        setFormData(prev => ({
            ...prev,
            questions: [
                ...prev.questions,
                {
                    text: '',
                    type: 'SINGLE_CHOICE',
                    points: 1,
                    answers: [
                        { text: '', isCorrect: true },
                        { text: '', isCorrect: false }
                    ]
                }
            ]
        }));
    };

    const removeQuestion = (index) => {
        const updatedQuestions = [...formData.questions];
        updatedQuestions.splice(index, 1);
        setFormData(prev => ({
            ...prev,
            questions: updatedQuestions
        }));
    };

    const addAnswer = (questionIndex) => {
        const updatedQuestions = [...formData.questions];

        // Ensure answers array exists
        if (!updatedQuestions[questionIndex].answers) {
            updatedQuestions[questionIndex].answers = [];
        }

        updatedQuestions[questionIndex].answers.push({
            text: '',
            isCorrect: false
        });

        setFormData(prev => ({
            ...prev,
            questions: updatedQuestions
        }));
    };

    const removeAnswer = (questionIndex, answerIndex) => {
        const updatedQuestions = [...formData.questions];
        updatedQuestions[questionIndex].answers.splice(answerIndex, 1);
        setFormData(prev => ({
            ...prev,
            questions: updatedQuestions
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            setError(null);

            // Form validation
            if (!formData.title.trim()) {
                throw new Error('Название теста обязательно');
            }

            if (!formData.subjectId) {
                throw new Error('Предмет обязателен');
            }

            if (formData.gradeIds.length === 0) {
                throw new Error('Выберите хотя бы один класс');
            }

            if (formData.questions.length === 0) {
                throw new Error('Тест должен содержать хотя бы один вопрос');
            }

            // Validate maxAttempts
            if (formData.maxAttempts < 1) {
                throw new Error('Количество попыток должно быть не менее 1');
            }

            // Validate questionsToShow if provided
            if (formData.questionsToShow !== null && formData.questionsToShow !== '') {
                const questionsToShowNum = parseInt(formData.questionsToShow);
                if (isNaN(questionsToShowNum) || questionsToShowNum < 1) {
                    throw new Error('Количество отображаемых вопросов должно быть положительным числом');
                }
                if (questionsToShowNum > formData.questions.length) {
                    throw new Error('Количество отображаемых вопросов не может быть больше общего количества вопросов');
                }
            }

            for (const [qIndex, question] of formData.questions.entries()) {
                if (!question.text.trim()) {
                    throw new Error(`Вопрос #${qIndex + 1} не содержит текста`);
                }

                // Skip answer validation for text questions if at least one answer exists
                if (question.type !== 'TEXT_ANSWER') {
                    if (!question.answers || question.answers.length < 2) {
                        throw new Error(`Вопрос #${qIndex + 1} должен содержать хотя бы два варианта ответа`);
                    }

                    const hasCorrectAnswer = question.answers.some(answer => answer.isCorrect);
                    if (!hasCorrectAnswer) {
                        throw new Error(`Вопрос #${qIndex + 1} должен иметь хотя бы один правильный ответ`);
                    }

                    for (const [aIndex, answer] of question.answers.entries()) {
                        if (!answer.text.trim()) {
                            throw new Error(`Ответ #${aIndex + 1} на вопрос #${qIndex + 1} не содержит текста`);
                        }
                    }
                } else {
                    // For TEXT_ANSWER, ensure we have at least one answer
                    if (!question.answers || question.answers.length === 0) {
                        throw new Error(`Вопрос #${qIndex + 1} должен иметь правильный ответ`);
                    }

                    // Ensure the answer has text
                    if (!question.answers[0].text.trim()) {
                        throw new Error(`Правильный ответ для вопроса #${qIndex + 1} не содержит текста`);
                    }
                }
            }
            const numericGradeIds = formData.gradeIds.map(id => {
                if (typeof id === 'number') return id;
                if (typeof id === 'string' && !isNaN(parseInt(id))) return parseInt(id);

                // Поиск ID по имени класса
                const matchingGrade = grades.find(g => g.fullName === id || g.name === id);
                return matchingGrade ? matchingGrade.id : null;
            }).filter(id => id !== null); // Удаляем все null значения

            // Prepare questions to show (convert empty string or null to undefined for backend)
            const questionsToShow = formData.questionsToShow && formData.questionsToShow !== ''
                ? parseInt(formData.questionsToShow)
                : undefined;

            const testCreateRequest = {
                title: formData.title,
                subjectId: parseInt(formData.subjectId),
                description: formData.description,
                timeLimit: parseInt(formData.timeLimit),
                gradeIds: numericGradeIds,
                maxAttempts: parseInt(formData.maxAttempts),
                questionsToShow: questionsToShow,
                questions: formData.questions.map(q => ({
                    text: q.text,
                    type: q.type,
                    points: parseInt(q.points) || 1,
                    answers: q.answers.map(a => ({
                        text: a.text,
                        isCorrect: a.isCorrect
                    }))
                }))
            };

            if (isEditing) {
                await TestService.updateTest(testId, testCreateRequest);
            } else {
                await TestService.createTest(testCreateRequest);
            }

            navigate('/tests');
        } catch (err) {
            setError(err.message || "Произошла ошибка при сохранении теста");
        } finally {
            setLoading(false);
        }
    };

    if (loading && isEditing) return <div>Загрузка теста...</div>;

    return (
        <div>
            <h2>{isEditing ? 'Редактирование теста' : 'Создание нового теста'}</h2>

            {error && (
                <div style={{
                    backgroundColor: '#f8d7da',
                    color: '#721c24',
                    padding: '0.75rem',
                    borderRadius: '4px',
                    marginBottom: '1rem'
                }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div style={{
                    backgroundColor: 'white',
                    padding: '2rem',
                    borderRadius: '8px',
                    boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                    marginBottom: '1.5rem'
                }}>
                    <div className="form-group">
                        <label htmlFor="title">Название теста *</label>
                        <input
                            id="title"
                            name="title"
                            type="text"
                            value={formData.title}
                            onChange={handleChange}
                            required
                            className="form-control"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="subjectId">Предмет *</label>
                        <select
                            id="subjectId"
                            name="subjectId"
                            value={formData.subjectId}
                            onChange={handleChange}
                            required
                            className="form-control"
                        >
                            <option value="">Выберите предмет</option>
                            {subjects.map(subject => (
                                <option key={subject.id} value={subject.id}>
                                    {subject.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="description">Описание</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows="3"
                            className="form-control"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="timeLimit">Ограничение по времени (минуты)</label>
                        <input
                            id="timeLimit"
                            name="timeLimit"
                            type="number"
                            min="1"
                            value={formData.timeLimit}
                            onChange={handleChange}
                            className="form-control"
                        />
                    </div>

                    {/* Added maxAttempts field */}
                    <div className="form-group">
                        <label htmlFor="maxAttempts">Количество разрешенных попыток</label>
                        <input
                            id="maxAttempts"
                            name="maxAttempts"
                            type="number"
                            min="1"
                            value={formData.maxAttempts}
                            onChange={handleChange}
                            className="form-control"
                        />
                        <small className="form-text text-muted">
                            Сколько раз студенты могут попытаться пройти этот тест
                        </small>
                    </div>

                    {/* Added questionsToShow field */}
                    <div className="form-group">
                        <label htmlFor="questionsToShow">Количество отображаемых вопросов</label>
                        <input
                            id="questionsToShow"
                            name="questionsToShow"
                            type="number"
                            min="1"
                            max={formData.questions.length}
                            value={formData.questionsToShow || ''}
                            onChange={handleChange}
                            className="form-control"
                        />
                        <small className="form-text text-muted">
                            Оставьте пустым, чтобы показывать все вопросы. При указании значения вопросы будут выбираться случайным образом.
                        </small>
                    </div>

                    <div className="form-group">
                        <label>Доступно для классов *</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '8px' }}>
                            {grades.length > 0 ? (
                                grades.map(grade => (
                                    <div key={grade.id} style={{ minWidth: '100px' }}>
                                        <label>
                                            <input
                                                type="checkbox"
                                                value={grade.id}
                                                checked={isGradeSelected(grade)}
                                                onChange={handleGradeChange}
                                            />
                                            {' ' + grade.fullName}
                                        </label>
                                    </div>
                                ))
                            ) : (
                                <p>У вас нет доступных классов. Обратитесь к администратору.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div>
                    <h3>Вопросы</h3>

                    {formData.questions.map((question, qIndex) => (
                        <div
                            key={qIndex}
                            style={{
                                backgroundColor: 'white',
                                padding: '1.5rem',
                                borderRadius: '8px',
                                boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                                marginBottom: '1.5rem'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                <h4>Вопрос #{qIndex + 1}</h4>
                                <button
                                    type="button"
                                    onClick={() => removeQuestion(qIndex)}
                                    style={{
                                        backgroundColor: '#F44336',
                                        color: 'white',
                                        padding: '0.5rem',
                                        borderRadius: '4px',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Удалить вопрос
                                </button>
                            </div>

                            <div className="form-group">
                                <label htmlFor={`question-${qIndex}`}>Текст вопроса *</label>
                                <textarea
                                    id={`question-${qIndex}`}
                                    value={question.text}
                                    onChange={(e) => handleQuestionChange(qIndex, 'text', e.target.value)}
                                    rows="2"
                                    required
                                    className="form-control"
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor={`question-type-${qIndex}`}>Тип вопроса</label>
                                <select
                                    id={`question-type-${qIndex}`}
                                    value={question.type}
                                    onChange={(e) => handleQuestionChange(qIndex, 'type', e.target.value)}
                                    className="form-control"
                                >
                                    <option value="SINGLE_CHOICE">Один вариант ответа</option>
                                    <option value="MULTIPLE_CHOICE">Несколько вариантов ответа</option>
                                    <option value="TEXT_ANSWER">Текстовый ответ</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label htmlFor={`question-points-${qIndex}`}>Количество баллов</label>
                                <input
                                    id={`question-points-${qIndex}`}
                                    type="number"
                                    min="1"
                                    value={question.points || 1}
                                    onChange={(e) => handleQuestionChange(qIndex, 'points', e.target.value)}
                                    className="form-control"
                                />
                            </div>

                            {question.type !== 'TEXT_ANSWER' ? (
                                <div style={{ marginTop: '1rem' }}>
                                    <h5>Варианты ответов</h5>

                                    {question.answers && question.answers.map((answer, aIndex) => (
                                        <div
                                            key={aIndex}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                marginBottom: '0.5rem',
                                                padding: '0.5rem',
                                                backgroundColor: '#f9f9f9',
                                                borderRadius: '4px'
                                            }}
                                        >
                                            <div style={{ flex: 1 }}>
                                                <input
                                                    type="text"
                                                    value={answer.text}
                                                    onChange={(e) => handleAnswerChange(qIndex, aIndex, 'text', e.target.value)}
                                                    placeholder="Текст ответа"
                                                    required
                                                    style={{ width: '100%' }}
                                                    className="form-control"
                                                />
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', marginLeft: '1rem' }}>
                                                <label style={{ marginRight: '0.5rem' }}>
                                                    <input
                                                        type={question.type === 'SINGLE_CHOICE' ? 'radio' : 'checkbox'}
                                                        name={`correct-answer-${qIndex}`}
                                                        checked={answer.isCorrect}
                                                        onChange={(e) => {
                                                            if (question.type === 'SINGLE_CHOICE') {
                                                                // Reset all answers to false first
                                                                const updatedQuestions = [...formData.questions];
                                                                updatedQuestions[qIndex].answers.forEach((a, i) => {
                                                                    a.isCorrect = false;
                                                                });
                                                                updatedQuestions[qIndex].answers[aIndex].isCorrect = true;
                                                                setFormData(prev => ({
                                                                    ...prev,
                                                                    questions: updatedQuestions
                                                                }));
                                                            } else {
                                                                // Just toggle the checkbox
                                                                handleAnswerChange(qIndex, aIndex, 'isCorrect', e.target.checked);
                                                            }
                                                        }}
                                                    />
                                                    Правильный
                                                </label>

                                                <button
                                                    type="button"
                                                    onClick={() => removeAnswer(qIndex, aIndex)}
                                                    style={{
                                                        backgroundColor: '#F44336',
                                                        color: 'white',
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '4px',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8rem'
                                                    }}
                                                    disabled={question.answers.length <= 2}
                                                >
                                                    Удалить
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={() => addAnswer(qIndex)}
                                        style={{
                                            backgroundColor: '#2196F3',
                                            color: 'white',
                                            padding: '0.5rem',
                                            borderRadius: '4px',
                                            border: 'none',
                                            cursor: 'pointer',
                                            marginTop: '0.5rem'
                                        }}
                                    >
                                        Добавить вариант ответа
                                    </button>
                                </div>
                            ) : (
                                <div style={{ marginTop: '1rem' }}>
                                    <h5>Правильный ответ</h5>
                                    <input
                                        type="text"
                                        value={question.answers?.[0]?.text || ''}
                                        onChange={(e) => {
                                            const updatedQuestions = [...formData.questions];
                                            if (!updatedQuestions[qIndex].answers || updatedQuestions[qIndex].answers.length === 0) {
                                                updatedQuestions[qIndex].answers = [{ text: '', isCorrect: true }];
                                            }
                                            updatedQuestions[qIndex].answers[0].text = e.target.value;
                                            updatedQuestions[qIndex].answers[0].isCorrect = true;
                                            setFormData(prev => ({
                                                ...prev,
                                                questions: updatedQuestions
                                            }));
                                        }}
                                        placeholder="Введите правильный ответ"
                                        style={{ width: '100%' }}
                                        className="form-control"
                                    />
                                    <p style={{ marginTop: '0.5rem', color: '#666', fontSize: '0.9rem' }}>
                                        Ответ студента будет проверяться на точное соответствие (без учета регистра)
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}

                    <button
                        type="button"
                        onClick={addQuestion}
                        style={{
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            padding: '0.5rem 1rem',
                            borderRadius: '4px',
                            border: 'none',
                            cursor: 'pointer',
                            marginBottom: '1.5rem'
                        }}
                    >
                        Добавить вопрос
                    </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <button
                        type="button"
                        onClick={() => navigate('/tests')}
                        style={{
                            backgroundColor: '#9E9E9E',
                            color: 'white',
                            padding: '0.5rem 1rem',
                            borderRadius: '4px',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        Отмена
                    </button>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            padding: '0.5rem 1rem',
                            borderRadius: '4px',
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        {loading ? 'Сохранение...' : (isEditing ? 'Обновить тест' : 'Создать тест')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default TestForm;