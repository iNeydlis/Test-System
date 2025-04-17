import React, { useState, useEffect, useContext } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import TestService from '../services/TestService';

const TestResultsList = () => {
    const { testId } = useParams();
    const { user } = useContext(AuthContext);

    const [results, setResults] = useState([]);
    const [test, setTest] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                setError(null);

                // For teachers and admins - get results for a specific test
                if (testId && (user?.role === 'TEACHER' || user?.role === 'ADMIN')) {
                    try {
                        // First try to get the test details
                        const testResponse = await TestService.getTestById(parseInt(testId));
                        console.log("Received test data:", testResponse?.data);

                        if (testResponse?.data) {
                            setTest(testResponse.data);
                        }

                        // Then get the test results
                        const resultsResponse = await TestService.getTestResults(testId);
                        console.log("Raw teacher results response:", resultsResponse);

// Handle the results data - ensure it's an array
                        let resultsData;

// Check if response is already an array
                        if (Array.isArray(resultsResponse)) {
                            resultsData = resultsResponse;
                        } else if (resultsResponse?.data && Array.isArray(resultsResponse.data)) {
                            resultsData = resultsResponse.data;
                        } else if (resultsResponse?.data?.results && Array.isArray(resultsResponse.data.results)) {
                            resultsData = resultsResponse.data.results;
                        } else if (resultsResponse?.data && typeof resultsResponse.data === 'object') {
                            // Convert object to array if needed (handling numbered keys)
                            resultsData = Object.values(resultsResponse.data).filter(item => item !== null && typeof item === 'object');
                        } else {
                            resultsData = [];
                        }

// Filter out any null or undefined entries
                        const validResults = resultsData.filter(item => item !== null && item !== undefined);
                        console.log("Processed results data:", validResults);
                        setResults(validResults);

                    } catch (err) {
                        console.error("Error fetching test data:", err);
                        setError("Ошибка при загрузке результатов: " + (err.response?.data?.message || err.message));
                    }
                }
                // For students - get all their results
                else if (user?.role === 'STUDENT') {
                    try {
                        const response = await TestService.getStudentResults();
                        console.log("Received student results:", response?.data);

                        // Handle the results data - ensure it's an array
                        if (response?.data) {
                            let resultsData;

                            // Check if data is already an array or needs to be extracted
                            if (Array.isArray(response.data)) {
                                resultsData = response.data;
                            } else if (response.data.results && Array.isArray(response.data.results)) {
                                resultsData = response.data.results;
                            } else if (typeof response.data === 'object') {
                                // Convert object to array if needed (handling numbered keys)
                                resultsData = Object.values(response.data).filter(item => item !== null && typeof item === 'object');
                            } else {
                                resultsData = [];
                            }

                            // Filter out any null or undefined entries
                            const validResults = resultsData.filter(item => item !== null && item !== undefined);
                            console.log("Processed student results data:", validResults);
                            setResults(validResults);
                        } else {
                            setResults([]);
                        }
                    } catch (err) {
                        console.error("Error fetching student results:", err);
                        setError("Ошибка при загрузке результатов: " + (err.response?.data?.message || err.message));
                    }
                } else {
                    setError("Недостаточно прав для просмотра результатов");
                }
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [testId, user?.role, user?.id]);

    // Calculate percentage of correct answers
    const calculatePercentage = (correctAnswers, totalQuestions) => {
        if (totalQuestions === 0) return 0;
        return Math.round((correctAnswers / totalQuestions) * 100);
    };

    // Determine status class based on percentage
    const getStatusClass = (percentage) => {
        if (percentage >= 90) return { color: '#4CAF50', text: 'Отлично' };
        if (percentage >= 75) return { color: '#2196F3', text: 'Хорошо' };
        if (percentage >= 60) return { color: '#FF9800', text: 'Удовлетворительно' };
        return { color: '#F44336', text: 'Неудовлетворительно' };
    };

    // Function to calculate score percentage
    const calculateScorePercentage = (score, maxScore) => {
        if (maxScore === 0) return 0;
        return Math.round((score / maxScore) * 100);
    };

    // Debug: Check results state
    console.log("Current results state:", results);
    console.log("Results length:", results.length);

    if (loading) return <div>Загрузка результатов...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div>
            <h2>
                {`Результаты теста`}

            </h2>

            {/* Debug info */}
            <div style={{ marginBottom: '1rem', color: 'gray', fontSize: '0.9rem' }}>
                Загружено результатов: {results.length}
            </div>

            {results.length === 0 ? (
                <p>Нет доступных результатов.</p>
            ) : (
                <div>
                    <table style={{
                        width: '100%',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                        borderCollapse: 'collapse',
                        marginTop: '1.5rem'
                    }}>
                        <thead>
                        <tr>
                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #eee' }}>
                                {user?.role === 'STUDENT' ? 'Тест' : 'Студент'}
                            </th>
                            <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '1px solid #eee' }}>
                                Дата
                            </th>
                            <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                                Результат
                            </th>
                            <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                                Статус
                            </th>
                            <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                                Действия
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        {results.map((result) => {
                            console.log("Processing result in render:", result);

                            // Use score and maxScore for percentage if available, otherwise use correctAnswers/totalQuestions
                            const hasScoreData = typeof result.score !== 'undefined' && typeof result.maxScore !== 'undefined';
                            const percentage = hasScoreData
                                ? calculateScorePercentage(result.score, result.maxScore)
                                : calculatePercentage(result.correctAnswers, result.totalQuestions);

                            const status = getStatusClass(percentage);

                            return (
                                <tr key={result.id}>
                                    <td style={{ padding: '1rem', borderBottom: '1px solid #eee' }}>
                                        {user?.role === 'STUDENT'
                                            ? (result.testTitle || result.test?.title || 'Без названия')
                                            : (result.studentName || result.student?.name || 'Неизвестно')}
                                    </td>
                                    <td style={{ padding: '1rem', borderBottom: '1px solid #eee' }}>
                                        {result.completedAt ? new Date(result.completedAt).toLocaleString() : '-'}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                                        {hasScoreData
                                            ? `${result.score} / ${result.maxScore} (${percentage}%)`
                                            : `${result.correctAnswers || 0} / ${result.totalQuestions || 0} (${percentage}%)`}
                                    </td>
                                    <td style={{
                                        padding: '1rem',
                                        textAlign: 'center',
                                        borderBottom: '1px solid #eee',
                                        color: status.color,
                                        fontWeight: 'bold'
                                    }}>
                                        {status.text}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                                        <Link
                                            to={user?.role === 'STUDENT'
                                                ? `/tests/result/${result.id}`
                                                : `/tests/teacher-result/${result.id}`}
                                            style={{
                                                backgroundColor: '#2196F3',
                                                color: 'white',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '4px',
                                                textDecoration: 'none'
                                            }}
                                        >
                                            Подробнее
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                        </tbody>
                    </table>

                    {user?.role === 'TEACHER' && test && results.length > 0 && (
                        <div style={{ marginTop: '1.5rem' }}>
                            <h3>Статистика по тесту</h3>

                            <div style={{
                                backgroundColor: 'white',
                                padding: '1.5rem',
                                borderRadius: '8px',
                                boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                gap: '1.5rem',
                                marginTop: '1rem'
                            }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2196F3' }}>
                                        {results.length}
                                    </div>
                                    <div>Всего прохождений</div>
                                </div>

                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4CAF50' }}>
                                        {Math.round(results.reduce((sum, item) => {
                                            const hasScoreData = typeof item.score !== 'undefined' && typeof item.maxScore !== 'undefined';
                                            return sum + (hasScoreData
                                                ? calculateScorePercentage(item.score, item.maxScore)
                                                : calculatePercentage(item.correctAnswers || 0, item.totalQuestions || 0));
                                        }, 0) / (results.length || 1))}%
                                    </div>
                                    <div>Средний результат</div>
                                </div>

                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#FF9800' }}>
                                        {results.filter(r => {
                                            const hasScoreData = typeof r.score !== 'undefined' && typeof r.maxScore !== 'undefined';
                                            const percentage = hasScoreData
                                                ? calculateScorePercentage(r.score, r.maxScore)
                                                : calculatePercentage(r.correctAnswers || 0, r.totalQuestions || 0);
                                            return percentage >= 60;
                                        }).length}
                                    </div>
                                    <div>Успешных прохождений</div>
                                </div>

                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#F44336' }}>
                                        {results.filter(r => {
                                            const hasScoreData = typeof r.score !== 'undefined' && typeof r.maxScore !== 'undefined';
                                            const percentage = hasScoreData
                                                ? calculateScorePercentage(r.score, r.maxScore)
                                                : calculatePercentage(r.correctAnswers || 0, r.totalQuestions || 0);
                                            return percentage < 60;
                                        }).length}
                                    </div>
                                    <div>Неуспешных прохождений</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div style={{ marginTop: '1.5rem' }}>
                <Link
                    to="/tests"
                    style={{
                        backgroundColor: '#9E9E9E',
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '4px',
                        textDecoration: 'none'
                    }}
                >
                    Назад к тестам
                </Link>
            </div>
        </div>
    );
};

export default TestResultsList;