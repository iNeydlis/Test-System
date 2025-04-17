import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TestService from '../services/TestService';

const TestTaking = () => {
    const { testId } = useParams();
    const navigate = useNavigate();

    const [test, setTest] = useState(null);
    const [testResult, setTestResult] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [timeLeft, setTimeLeft] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [timeExpired, setTimeExpired] = useState(false);

    // Загрузка теста и начало прохождения
    useEffect(() => {
        const startTestSession = async () => {
            try {
                setLoading(true);

                // Получаем информацию о тесте
                const testResponse = await TestService.getTestById(testId);
                // Проверяем, возвращается ли ответ в поле data или напрямую
                const testData = testResponse.data || testResponse;
                setTest(testData);

                // Сначала проверим, есть ли незавершенный тест
                const inProgressResponse = await TestService.getInProgressTest(testId);
                const inProgressData = inProgressResponse.data || inProgressResponse;

                let resultData;
                if (inProgressData && inProgressData.id) {
                    // Если есть незавершенный тест, используем его
                    resultData = inProgressData;

                    // Вычисляем оставшееся время
                    if (testData.timeLimit && resultData.startedAt) {
                        const startTime = new Date(resultData.startedAt);
                        const deadlineTime = new Date(startTime.getTime() + testData.timeLimit * 60 * 1000);
                        const currentTime = new Date();
                        const timeLeftMs = deadlineTime - currentTime;

                        if (timeLeftMs > 0) {
                            setTimeLeft(Math.floor(timeLeftMs / 1000)); // Конвертируем в секунды
                        } else {
                            setTimeExpired(true);
                            setTimeLeft(0);
                        }
                    }
                } else {
                    // Иначе начинаем новый тест
                    const startResult = await TestService.startTest(testId);
                    resultData = startResult.data || startResult;

                    // Устанавливаем время на тест
                    if (testData.timeLimit) {
                        setTimeLeft(testData.timeLimit * 60); // Переводим минуты в секунды
                    }
                }

                setTestResult(resultData);

                if (!resultData || !resultData.id) {
                    throw new Error('Не удалось получить данные о результате теста');
                }

                // Загружаем вопросы
                const questionsResponse = await TestService.getTestQuestions(testId, resultData.id);
                // Проверяем, возвращается ли ответ в поле data или напрямую
                const questionsData = questionsResponse.data || questionsResponse;

                // Удаляем информацию о правильных ответах, если она присутствует
                const cleanQuestions = questionsData.map(question => {
                    const cleanQuestion = {...question};

                    // Удаляем информацию о правильности из ответов
                    if (cleanQuestion.answers) {
                        cleanQuestion.answers = cleanQuestion.answers.map(answer => {
                            const { isCorrect, ...cleanAnswer } = answer;
                            return cleanAnswer;
                        });
                    }

                    return cleanQuestion;
                });

                setQuestions(cleanQuestions);

                // Инициализируем объект с ответами пользователя
                const initialAnswers = {};
                cleanQuestions.forEach(question => {
                    if (question.type === 'MULTIPLE_CHOICE') {
                        initialAnswers[question.id] = [];
                    } else if (question.type === 'TEXT_ANSWER') {
                        initialAnswers[question.id] = '';
                    } else {
                        initialAnswers[question.id] = null;
                    }
                });
                setAnswers(initialAnswers);
            } catch (err) {
                console.error('Error in startTestSession:', err);
                setError("Ошибка при загрузке теста: " + (err.response?.data?.message || err.message));
            } finally {
                setLoading(false);
            }
        };

        startTestSession();
    }, [testId]);

    // Таймер для обратного отсчета
    useEffect(() => {
        if (timeLeft === null || timeLeft <= 0) return;

        const timer = setInterval(() => {
            setTimeLeft(prevTime => {
                if (prevTime <= 1) {
                    clearInterval(timer);
                    setTimeExpired(true);
                    // Автоматическая отправка теста при истечении времени
                    handleSubmitTest(true);
                    return 0;
                }
                return prevTime - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [timeLeft]);

    // Обработчик ответа на вопрос
    const handleAnswerChange = (questionId, value, isMultiple = false, isText = false) => {
        if (timeExpired) return; // Не позволяем менять ответы после истечения времени

        if (isText) {
            // Для текстовых ответов
            setAnswers(prev => ({
                ...prev,
                [questionId]: value
            }));
        } else if (isMultiple) {
            // Множественный выбор - добавляем/удаляем ID ответа из массива
            setAnswers(prev => {
                const currentAnswers = [...(prev[questionId] || [])];
                const index = currentAnswers.indexOf(value);

                if (index === -1) {
                    currentAnswers.push(value);
                } else {
                    currentAnswers.splice(index, 1);
                }

                return {
                    ...prev,
                    [questionId]: currentAnswers
                };
            });
        } else {
            // Единственный выбор - просто сохраняем ID ответа
            setAnswers(prev => ({
                ...prev,
                [questionId]: value
            }));
        }
    };

    // Переход к следующему вопросу
    const handleNextQuestion = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prevIndex => prevIndex + 1);
        }
    };

    // Переход к предыдущему вопросу
    const handlePrevQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prevIndex => prevIndex - 1);
        }
    };

    // Отправка ответов на тест
    const handleSubmitTest = async (isAutoSubmit = false) => {
        if (submitting) return; // Предотвращаем повторную отправку

        try {
            setSubmitting(true);

            // Проверка заполнения всех ответов
            const unansweredQuestions = [];
            questions.forEach((question, index) => {
                const answer = answers[question.id];
                if (
                    answer === null ||
                    (Array.isArray(answer) && answer.length === 0) ||
                    (question.type === 'TEXT_ANSWER' && answer.trim() === '')
                ) {
                    unansweredQuestions.push(index + 1);
                }
            });

            // Если время не истекло и есть неотвеченные вопросы, показываем предупреждение
            if (unansweredQuestions.length > 0 && !isAutoSubmit && !timeExpired) {
                if (!window.confirm(`Вы не ответили на вопросы: ${unansweredQuestions.join(', ')}. Хотите отправить тест?`)) {
                    setSubmitting(false);
                    return;
                }
            }

            // Формируем данные для отправки
            const submissionData = {
                testResultId: testResult.id,
                answers: Object.entries(answers).map(([questionId, answer]) => {
                    const question = questions.find(q => q.id === parseInt(questionId));

                    if (question.type === 'TEXT_ANSWER') {
                        return {
                            questionId: parseInt(questionId),
                            textAnswer: answer,
                            selectedAnswerIds: []
                        };
                    } else {
                        return {
                            questionId: parseInt(questionId),
                            selectedAnswerIds: Array.isArray(answer) ? answer : answer !== null ? [answer] : []
                        };
                    }
                })
            };

            // Отправляем ответы
            const result = await TestService.submitTest(submissionData);
            // Проверяем, возвращается ли ответ в поле data или напрямую
            const resultData = result.data || result;

            // Переходим на страницу с результатом
            navigate(`/tests/result/${resultData.id}`, { state: { result: resultData } });

        } catch (err) {
            console.error('Error submitting test:', err);
            // Если время истекло, но тест все еще отправляется, пробуем отправить еще раз
            if (err.response?.data?.message === "Время выполнения теста истекло" && !isAutoSubmit) {
                setTimeExpired(true);
                setTimeLeft(0);
                // Повторно пытаемся отправить с флагом isAutoSubmit=true
                handleSubmitTest(true);
            } else {
                setError("Ошибка при отправке ответов: " + (err.response?.data?.message || err.message));
                setSubmitting(false);
            }
        }
    };

    // Проверка, отвечен ли вопрос
    const isQuestionAnswered = (questionId) => {
        const answer = answers[questionId];
        const question = questions.find(q => q.id === questionId);

        if (!question) return false;

        if (question.type === 'TEXT_ANSWER') {
            return answer && answer.trim() !== '';
        } else if (question.type === 'MULTIPLE_CHOICE') {
            return Array.isArray(answer) && answer.length > 0;
        } else {
            return answer !== null;
        }
    };

    if (loading) return <div>Загрузка теста...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!test || !questions.length) return <div>Тест не найден или не содержит вопросов</div>;

    const currentQuestion = questions[currentQuestionIndex];

    // Форматирование оставшегося времени
    const formatTimeLeft = () => {
        if (timeLeft === null) return '';

        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;

        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    // Добавляем предупреждение об истекшем времени
    const timeExpiredWarning = timeExpired ? (
        <div style={{
            backgroundColor: '#ffebee',
            color: '#c62828',
            padding: '1rem',
            borderRadius: '4px',
            marginBottom: '1rem',
            fontWeight: 'bold',
            textAlign: 'center'
        }}>
            Время выполнения теста истекло! Ваши ответы будут отправлены автоматически.
        </div>
    ) : null;

    // Рендер содержимого вопроса в зависимости от типа
    const renderQuestionContent = () => {
        if (currentQuestion.type === 'TEXT_ANSWER') {
            return (
                <div style={{ marginTop: '1.5rem' }}>
                    <textarea
                        value={answers[currentQuestion.id] || ''}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value, false, true)}
                        disabled={timeExpired}
                        placeholder="Введите ваш ответ здесь..."
                        style={{
                            width: '100%',
                            minHeight: '150px',
                            padding: '0.75rem',
                            borderRadius: '4px',
                            border: '1px solid #ddd',
                            opacity: timeExpired ? 0.7 : 1
                        }}
                    />
                </div>
            );
        } else {
            return (
                <div style={{ marginTop: '1.5rem' }}>
                    {currentQuestion.answers.map(answer => (
                        <div key={answer.id} style={{ marginBottom: '0.75rem' }}>
                            <label style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0.75rem',
                                backgroundColor: '#f9f9f9',
                                borderRadius: '4px',
                                cursor: timeExpired ? 'not-allowed' : 'pointer',
                                opacity: timeExpired ? 0.7 : 1
                            }}>
                                <input
                                    type={currentQuestion.type === 'MULTIPLE_CHOICE' ? 'checkbox' : 'radio'}
                                    name={`question-${currentQuestion.id}`}
                                    checked={
                                        currentQuestion.type === 'MULTIPLE_CHOICE'
                                            ? (answers[currentQuestion.id] || []).includes(answer.id)
                                            : answers[currentQuestion.id] === answer.id
                                    }
                                    onChange={() => handleAnswerChange(
                                        currentQuestion.id,
                                        answer.id,
                                        currentQuestion.type === 'MULTIPLE_CHOICE'
                                    )}
                                    disabled={timeExpired}
                                    style={{ marginRight: '1rem' }}
                                />
                                {answer.text}
                            </label>
                        </div>
                    ))}
                </div>
            );
        }
    };

    return (
        <div>
            <h2>{test.title}</h2>

            {timeExpiredWarning}

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: 'white',
                padding: '1rem',
                borderRadius: '8px',
                boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                marginBottom: '1.5rem'
            }}>
                <div>
                    <strong>Предмет:</strong> {test.subject}
                </div>
                {timeLeft !== null && (
                    <div style={{
                        fontWeight: 'bold',
                        color: timeLeft < 60 ? 'red' : (timeLeft < 300 ? 'orange' : 'inherit')
                    }}>
                        {timeExpired
                            ? 'Время истекло!'
                            : `Оставшееся время: ${formatTimeLeft()}`}
                    </div>
                )}
                <div>
                    <strong>Вопрос:</strong> {currentQuestionIndex + 1} из {questions.length}
                </div>
            </div>

            <div style={{
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '8px',
                boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                marginBottom: '1.5rem'
            }}>
                <h3>{currentQuestion.text}</h3>
                {renderQuestionContent()}
            </div>

            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '1.5rem'
            }}>
                <button
                    onClick={handlePrevQuestion}
                    disabled={currentQuestionIndex === 0 || submitting}
                    style={{
                        backgroundColor: '#2196F3',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: currentQuestionIndex === 0 || submitting ? 'not-allowed' : 'pointer',
                        opacity: currentQuestionIndex === 0 || submitting ? 0.5 : 1
                    }}
                >
                    Предыдущий вопрос
                </button>

                {currentQuestionIndex < questions.length - 1 ? (
                    <button
                        onClick={handleNextQuestion}
                        disabled={submitting}
                        style={{
                            backgroundColor: '#2196F3',
                            color: 'white',
                            padding: '0.5rem 1rem',
                            borderRadius: '4px',
                            border: 'none',
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            opacity: submitting ? 0.5 : 1
                        }}
                    >
                        Следующий вопрос
                    </button>
                ) : (
                    <button
                        onClick={() => handleSubmitTest(false)}
                        disabled={submitting}
                        style={{
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            padding: '0.5rem 1rem',
                            borderRadius: '4px',
                            border: 'none',
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            opacity: submitting ? 0.5 : 1
                        }}
                    >
                        {submitting ? 'Отправка...' : 'Завершить тест'}
                    </button>
                )}
            </div>

            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '0.5rem',
                marginBottom: '1.5rem'
            }}>
                {questions.map((question, index) => (
                    <button
                        key={question.id}
                        onClick={() => setCurrentQuestionIndex(index)}
                        disabled={submitting}
                        style={{
                            width: '2.5rem',
                            height: '2.5rem',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor:
                                currentQuestionIndex === index
                                    ? '#2196F3'
                                    : isQuestionAnswered(question.id)
                                        ? '#4CAF50'
                                        : '#F44336',
                            color: 'white',
                            borderRadius: '50%',
                            border: 'none',
                            cursor: submitting ? 'not-allowed' : 'pointer',
                            opacity: submitting ? 0.7 : 1
                        }}
                    >
                        {index + 1}
                    </button>
                ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                    onClick={() => handleSubmitTest(false)}
                    disabled={submitting}
                    style={{
                        backgroundColor: '#4CAF50',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        opacity: submitting ? 0.5 : 1
                    }}
                >
                    {submitting ? 'Отправка...' : 'Завершить тест'}
                </button>
            </div>
        </div>
    );
};

export default TestTaking;