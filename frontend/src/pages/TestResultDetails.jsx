import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import TestService from '../services/TestService';

const TestResultDetails = () => {
    const { resultId } = useParams();
    const { user } = useContext(AuthContext);

    const [resultDetails, setResultDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchResultDetails = async () => {
            try {
                setLoading(true);
                setError(null);

                // Получаем данные из TestService
                const response = await TestService.getTestResultDetails(resultId);
                console.log("Received test result details:", response);

                // Проверяем структуру ответа и устанавливаем данные
                // Изменим проверку, чтобы поддерживать как response.data, так и просто response
                const data = response?.data || response;

                if (data) {
                    console.log("Setting result details:", data);
                    setResultDetails(data);
                } else {
                    setError("Не удалось загрузить данные");
                }
            } catch (err) {
                console.error("Error fetching test result details:", err);
                setError("Ошибка при загрузке результатов: " +
                    (err.response?.data?.message || err.message));
            } finally {
                setLoading(false);
            }
        };

        fetchResultDetails();
    }, [resultId]);

    // Проверка данных после установки в state
    useEffect(() => {
        console.log("Current resultDetails state:", resultDetails);
    }, [resultDetails]);

    // Determine status class based on percentage
    const getStatusClass = (percentage) => {
        if (percentage >= 90) return { color: '#4CAF50', text: 'Отлично' };
        if (percentage >= 75) return { color: '#2196F3', text: 'Хорошо' };
        if (percentage >= 60) return { color: '#FF9800', text: 'Удовлетворительно' };
        return { color: '#F44336', text: 'Неудовлетворительно' };
    };

    if (loading) return <div>Загрузка деталей результата...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!resultDetails) return <div>Результат не найден</div>;

    // Убедимся, что у нас есть percentageCorrect
    const percentageCorrect = resultDetails.percentageCorrect || 0;
    const status = getStatusClass(percentageCorrect);

    return (
        <div>
            <h2>Результаты теста "{resultDetails.testTitle}"</h2>

            {/* Информация о результате */}
            <div style={{
                backgroundColor: 'white',
                padding: '1.5rem',
                borderRadius: '8px',
                boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                marginTop: '1.5rem'
            }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                    <div>
                        <p style={{ margin: '0', fontWeight: 'bold' }}>Студент:</p>
                        <p>{resultDetails.studentName}</p>
                    </div>
                    <div>
                        <p style={{ margin: '0', fontWeight: 'bold' }}>Дата прохождения:</p>
                        <p>{new Date(resultDetails.completedAt).toLocaleString()}</p>
                    </div>
                    <div>
                        <p style={{ margin: '0', fontWeight: 'bold' }}>Результат:</p>
                        <p>{resultDetails.score} / {resultDetails.maxScore} ({percentageCorrect}%)</p>
                    </div>
                    <div>
                        <p style={{ margin: '0', fontWeight: 'bold' }}>Статус:</p>
                        <p style={{ color: status.color, fontWeight: 'bold' }}>{status.text}</p>
                    </div>
                    <div>
                        <p style={{ margin: '0', fontWeight: 'bold' }}>Попытка:</p>
                        <p>{resultDetails.attemptNumber}</p>
                    </div>
                    <div>
                        <p style={{ margin: '0', fontWeight: 'bold' }}>Правильных ответов:</p>
                        <p>{resultDetails.correctAnswersCount} из {resultDetails.totalQuestionsCount}</p>
                    </div>
                </div>
            </div>

            {/* Ответы на вопросы */}
            <h3 style={{ marginTop: '2rem' }}>Ответы на вопросы</h3>

            {resultDetails.studentAnswers && resultDetails.studentAnswers.map((answer, index) => (
                <div key={answer.id || index} style={{
                    backgroundColor: answer.correct ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                    marginTop: '1rem',
                    borderLeft: `5px solid ${answer.correct ? '#4CAF50' : '#F44336'}`
                }}>
                    <h4 style={{ margin: '0 0 1rem 0' }}>
                        Вопрос {index + 1}: {answer.questionText}
                    </h4>

                    <div style={{ marginBottom: '1rem' }}>
                        <p style={{ margin: '0', fontWeight: 'bold' }}>Тип вопроса:</p>
                        <p style={{ margin: '0.5rem 0' }}>
                            {answer.questionType === 'TEXT_ANSWER' ? 'Текстовый ответ' :
                                answer.questionType === 'SINGLE_CHOICE' ? 'Одиночный выбор' :
                                    'Множественный выбор'}
                        </p>
                    </div>

                    {answer.questionType === 'TEXT_ANSWER' ? (
                        <div>
                            <p style={{ margin: '0', fontWeight: 'bold' }}>Ответ студента:</p>
                            <p style={{ margin: '0.5rem 0' }}>{answer.textAnswer || '(не указан)'}</p>

                            <p style={{ margin: '1rem 0 0 0', fontWeight: 'bold' }}>Правильный ответ:</p>
                            <p style={{ margin: '0.5rem 0' }}>
                                {answer.correctAnswers && answer.correctAnswers.length > 0
                                    ? answer.correctAnswers[0].text
                                    : '(нет правильного ответа)'}
                            </p>
                        </div>
                    ) : (
                        <div>
                            <p style={{ margin: '0', fontWeight: 'bold' }}>Выбранные ответы:</p>
                            {answer.selectedAnswers && answer.selectedAnswers.length > 0 ? (
                                <ul style={{ margin: '0.5rem 0' }}>
                                    {answer.selectedAnswers.map((selectedAnswer, ansIdx) => (
                                        <li key={selectedAnswer.id || `sel-${ansIdx}`} style={{
                                            color: selectedAnswer.isCorrect ? '#4CAF50' : '#F44336'
                                        }}>
                                            {selectedAnswer.text}
                                            {selectedAnswer.isCorrect ? ' ✓' : ' ✗'}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p style={{ margin: '0.5rem 0', fontStyle: 'italic' }}>
                                    Ответ не выбран
                                </p>
                            )}

                            <p style={{ margin: '1rem 0 0 0', fontWeight: 'bold' }}>Правильные ответы:</p>
                            {answer.correctAnswers && answer.correctAnswers.length > 0 ? (
                                <ul style={{ margin: '0.5rem 0', color: '#4CAF50' }}>
                                    {answer.correctAnswers.map((correctAnswer, ansIdx) => (
                                        <li key={correctAnswer.id || `corr-${ansIdx}`}>{correctAnswer.text}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p style={{ margin: '0.5rem 0', fontStyle: 'italic' }}>
                                    Нет правильных ответов
                                </p>
                            )}
                        </div>
                    )}

                    <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                        <span style={{
                            backgroundColor: answer.correct ? '#4CAF50' : '#F44336',
                            color: 'white',
                            padding: '0.3rem 0.8rem',
                            borderRadius: '4px',
                            fontSize: '0.9rem'
                        }}>
                            {answer.correct ? 'Верно' : 'Неверно'} • {answer.earnedPoints} / {answer.maxPoints} баллов
                        </span>
                    </div>
                </div>
            ))}

            {/* Кнопка возврата */}
            <div style={{ marginTop: '2rem' }}>
                <Link
                    to={user?.role === 'STUDENT' ? "/tests" : `/tests/${resultDetails.testId}/results`}
                    style={{
                        backgroundColor: '#9E9E9E',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        textDecoration: 'none'
                    }}
                >
                    Назад к результатам
                </Link>
            </div>
        </div>
    );
};

export default TestResultDetails;