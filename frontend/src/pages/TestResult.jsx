import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import TestService from '../services/TestService';

const TestResult = () => {
    const { resultId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [result, setResult] = useState(location.state?.result || null);
    const [loading, setLoading] = useState(!location.state?.result);
    const [error, setError] = useState(null);

    useEffect(() => {
        // If result wasn't passed via location state, load it
        if (!result && resultId) {
            const fetchResult = async () => {
                try {
                    setLoading(true);
                    // Try to use the specific API endpoint if available
                    try {
                        const response = await TestService.getResultById(resultId);
                        setResult(response.data);
                    } catch (err) {
                        // Fallback to getting all results and finding the right one
                        const response = await TestService.getStudentResults();
                        const foundResult = response.data.find(r => r.id === parseInt(resultId));

                        if (foundResult) {
                            setResult(foundResult);
                        } else {
                            setError("Результат не найден");
                        }
                    }
                } catch (err) {
                    setError("Ошибка при загрузке результата: " + (err.response?.data?.message || err.message));
                } finally {
                    setLoading(false);
                }
            };

            fetchResult();
        }
    }, [resultId, result]);

    if (loading) return <div>Загрузка результата...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (!result) return <div>Результат не найден</div>;

    // Calculate time spent if startedAt and completedAt are available
    const calculateTimeSpent = () => {
        if (result.startedAt && result.completedAt) {
            const start = new Date(result.startedAt);
            const end = new Date(result.completedAt);
            const diffSeconds = Math.floor((end - start) / 1000);
            return diffSeconds;
        }
        return null;
    };

    const timeSpent = result.timeSpent || calculateTimeSpent();

    // Use score and maxScore from the result
    const score = result.score || 0;
    const maxScore = result.maxScore || 0;

    // Calculate percentage based on score and maxScore
    const calculatePercentage = () => {
        if (!maxScore || maxScore === 0) return 0;
        return Math.round((score / maxScore) * 100);
    };

    // Определение статуса прохождения
    const getStatusClass = () => {
        const percentage = calculatePercentage();
        if (percentage >= 90) return { color: '#4CAF50', text: 'Отлично' };
        if (percentage >= 75) return { color: '#2196F3', text: 'Хорошо' };
        if (percentage >= 60) return { color: '#FF9800', text: 'Удовлетворительно' };
        return { color: '#F44336', text: 'Неудовлетворительно' };
    };

    const statusInfo = getStatusClass();
    const completedAt = result.completedAt ? new Date(result.completedAt) : null;
    const testTitle = result.testTitle || result.test?.title || "Тест";

    return (
        <div>
            <h2>Результат тестирования</h2>

            <div style={{
                backgroundColor: 'white',
                padding: '2rem',
                borderRadius: '8px',
                boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                marginBottom: '1.5rem'
            }}>
                <h3 style={{ marginBottom: '1.5rem' }}>{testTitle}</h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
                    <div><strong>Дата прохождения:</strong></div>
                    <div>{completedAt ? completedAt.toLocaleString() : 'Не указано'}</div>

                    <div><strong>Затраченное время:</strong></div>
                    <div>{timeSpent ? `${Math.floor(timeSpent / 60)} мин ${timeSpent % 60} сек` : 'Не указано'}</div>

                    <div><strong>Всего балов:</strong></div>
                    <div>{maxScore}</div>

                    <div><strong>Набрано балов:</strong></div>
                    <div>{score}</div>

                    <div><strong>Процент выполнения:</strong></div>
                    <div>{maxScore > 0 ? `${calculatePercentage()}%` : 'Не указано'}</div>

                    <div><strong>Результат:</strong></div>
                    <div style={{ color: statusInfo.color, fontWeight: 'bold' }}>{statusInfo.text}</div>
                </div>
            </div>

            {result.questionResults && result.questionResults.length > 0 && (
                <div>
                    <h3>Детали ответов</h3>

                    {result.questionResults.map((qResult, index) => (
                        <div
                            key={index}
                            style={{
                                backgroundColor: 'white',
                                padding: '1.5rem',
                                borderRadius: '8px',
                                boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                                marginBottom: '1rem',
                                borderLeft: `5px solid ${qResult.correct ? '#4CAF50' : '#F44336'}`
                            }}
                        >
                            <h4 style={{ marginBottom: '1rem' }}>
                                Вопрос {index + 1}: {qResult.questionText || 'Текст вопроса не доступен'}
                            </h4>

                            <div>
                                <strong>Ваш ответ:</strong> {(qResult.userAnswers && qResult.userAnswers.length) ?
                                qResult.userAnswers.join(', ') : 'Не указан'}
                            </div>

                            {!qResult.correct && qResult.correctAnswers && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <strong>Правильный ответ:</strong> {qResult.correctAnswers.join(', ')}
                                </div>
                            )}

                            <div
                                style={{
                                    marginTop: '0.5rem',
                                    color: qResult.correct ? '#4CAF50' : '#F44336',
                                    fontWeight: 'bold'
                                }}
                            >
                                {qResult.correct ? 'Верно' : 'Неверно'}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                <button
                    onClick={() => navigate('/tests')}
                    style={{
                        backgroundColor: '#2196F3',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    К списку тестов
                </button>

                <button
                    onClick={() => window.print()}
                    style={{
                        backgroundColor: '#9E9E9E',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        border: 'none',
                        cursor: 'pointer'
                    }}
                >
                    Распечатать результат
                </button>
            </div>
        </div>
    );
};

export default TestResult;