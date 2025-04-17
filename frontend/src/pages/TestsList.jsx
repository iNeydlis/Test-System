import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import TestService from '../services/TestService';

const TestsList = () => {
    const [tests, setTests] = useState([]); // Initialize with empty array
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useContext(AuthContext);

    useEffect(() => {
        fetchTests();
    }, []);

    const fetchTests = async () => {
        try {
            setLoading(true);
            const response = await TestService.getAllTests();
            // The response is already the data due to your API interceptor
            setTests(Array.isArray(response) ? response : []);
        } catch (err) {
            console.error("Error fetching tests:", err);
            setError("Ошибка при загрузке тестов: " + (err.message || 'Произошла ошибка'));
            setTests([]); // Ensure tests is always an array
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTest = async (testId) => {
        if (window.confirm('Вы уверены, что хотите деактивировать этот тест?')) {
            try {
                await TestService.deleteTest(testId);
                // Update the local state to reflect the change
                setTests(prevTests =>
                    prevTests.map(test =>
                        test.id === testId
                            ? { ...test, active: false }
                            : test
                    )
                );
            } catch (err) {
                console.error("Error deactivating test:", err);
                setError("Ошибка при деактивации теста: " + (err.message || 'Произошла ошибка'));
            }
        }
    };

    // New method for permanent deletion
    const handlePermanentDeleteTest = async (testId) => {
        if (window.confirm('ВНИМАНИЕ! Вы собираетесь ПОЛНОСТЬЮ удалить тест вместе со всеми результатами. Это действие нельзя отменить. Продолжить?')) {
            try {
                await TestService.permanentlyDeleteTest(testId);
                // Remove the test from the list
                setTests(prevTests => prevTests.filter(test => test.id !== testId));
            } catch (err) {
                console.error("Error permanently deleting test:", err);
                setError("Ошибка при удалении теста: " + (err.message || 'Произошла ошибка'));
            }
        }
    };

    const handleReactivateTest = async (testId, clearAttempts) => {
        const confirmMessage = clearAttempts
            ? 'Вы хотите активировать тест и удалить все существующие попытки? Это действие нельзя отменить.'
            : 'Вы хотите активировать тест?';

        if (window.confirm(confirmMessage)) {
            try {
                await TestService.reactivateTest(testId, clearAttempts);
                // Refresh the tests list
                fetchTests();
            } catch (err) {
                console.error("Error reactivating test:", err);
                setError("Ошибка при активации теста: " + (err.message || 'Произошла ошибка'));
            }
        }
    };

    // Add defensive programming - ensure tests is always treated as an array
    const renderTests = () => {
        const testsArray = Array.isArray(tests) ? tests : [];

        if (testsArray.length === 0) {
            return <p>Нет доступных тестов.</p>;
        }

        // Group tests by active status for teachers and admins
        if (user?.role === 'TEACHER' || user?.role === 'ADMIN') {
            const activeTests = testsArray.filter(test => test.active !== false);
            const inactiveTests = testsArray.filter(test => test.active === false);

            return (
                <>
                    <h3>Активные тесты</h3>
                    {activeTests.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                            {activeTests.map(test => renderTestCard(test))}
                        </div>
                    ) : (
                        <p>Нет активных тестов.</p>
                    )}

                    <h3>Неактивные тесты</h3>
                    {inactiveTests.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                            {inactiveTests.map(test => renderTestCard(test))}
                        </div>
                    ) : (
                        <p>Нет неактивных тестов.</p>
                    )}
                </>
            );
        }

        // For students, only show active tests
        return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {testsArray
                    .filter(test => test.active !== false)
                    .map(test => renderTestCard(test))}
            </div>
        );
    };

    const renderTestCard = (test) => {
        const isActive = test.active !== false;
        const calculatePercentage = (score, maxScore) => {
            if (!score || !maxScore) return 0;
            return Math.round((score / maxScore) * 100);
        };

        // Function to calculate grade from percentage
        const calculateGrade = (score, maxScore) => {
            const percentage = calculatePercentage(score, maxScore);

            if (percentage >= 90) return '5 (отлично)';
            if (percentage >= 75) return '4 (хорошо)';
            if (percentage >= 60) return '3 (удовлетворительно)';
            return '2 (неудовлетворительно)';
        };
        return (
            <div
                key={test.id}
                style={{
                    backgroundColor: 'white',
                    padding: '1rem',
                    borderRadius: '8px',
                    boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                    opacity: isActive ? 1 : 0.7,
                    border: isActive ? 'none' : '1px solid #ccc'
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3>{test.title}</h3>
                    {!isActive && (
                        <span style={{
                            backgroundColor: '#f44336',
                            color: 'white',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '12px'
                        }}>
                            Неактивен
                        </span>
                    )}
                </div>
                <p><strong>Предмет:</strong> {test.subjectName?.name || test.subjectName || 'Не указан'}</p>
                <p><strong>Описание:</strong> {test.description || 'Нет описания'}</p>
                <p><strong>Вопросов:</strong> {(test.questionsToShow && test.questionsToShow >= 1) ? test.questionsToShow : test.questionCount || '0'}</p>
                <p><strong>Макс. попыток:</strong> {test.maxAttempts || '1'}</p>

                {/* Добавленная информация для учеников */}
                {user?.role === 'STUDENT' && (
                    <>
                        {user?.role === 'STUDENT' && (
                            <>
                                {test.bestScore !== undefined && test.bestScore !== null && test.bestScore !== '' ? (
                                    <div>
                                        <p style={{ color: '#1976D2', fontWeight: 'bold', fontSize: '16px', margin: '8px 0' }}>
                                            <strong>Оценка:</strong> {calculateGrade(test.bestScore, test.maxScore)}
                                        </p>
                                        <p style={{ color: '#2E7D32', margin: '8px 0' }}>
                                            <strong>Результат:</strong> {test.bestScore} из {test.maxScore || test.totalPoints} баллов
                                            ({calculatePercentage(test.bestScore, test.maxScore)}%)
                                        </p>
                                    </div>
                                ) : (
                                    <p style={{ color: '#1976D2', margin: '8px 0' }}>
                                        <strong>Статус:</strong> Требуется пройти тест
                                    </p>
                                )}
                                {test.maxAttempts !== undefined && (
                                    <p style={{ margin: '8px 0' }}>
                                        <strong>Попытки:</strong>{' '}
                                        {test.remainingAttempts !== undefined
                                            ? `${test.maxAttempts - test.remainingAttempts} из ${test.maxAttempts}`
                                            : `${test.maxAttempts} максимум`}
                                    </p>
                                )}
                            </>
                        )}
                    </>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
                    {user?.role === 'STUDENT' ? (
                        <Link
                            to={`/tests/${test.id}/take`}
                            style={{
                                backgroundColor: test.remainingAttempts > 0 && isActive ? '#2196F3' : '#9E9E9E',
                                color: 'white',
                                padding: '0.5rem 1rem',
                                borderRadius: '4px',
                                textDecoration: 'none',
                                cursor: test.remainingAttempts > 0 && isActive ? 'pointer' : 'not-allowed'
                            }}
                            onClick={(e) => {
                                if (test.remainingAttempts <= 0 || !isActive) {
                                    e.preventDefault();
                                    const message = !isActive
                                        ? 'Этот тест неактивен и недоступен для прохождения'
                                        : 'У вас не осталось попыток для этого теста';
                                    alert(message);
                                }
                            }}
                        >
                            {!isActive
                                ? 'Тест неактивен'
                                : (test.remainingAttempts > 0 ? 'Пройти тест' : 'Нет попыток')}
                        </Link>
                    ) : (
                        <>
                            <Link
                                to={`/tests/${test.id}/results`}
                                style={{
                                    backgroundColor: '#2196F3',
                                    color: 'white',
                                    padding: '0.5rem 1rem',
                                    borderRadius: '4px',
                                    textDecoration: 'none'
                                }}
                            >
                                Результаты
                            </Link>
                            <div>
                                {isActive ? (
                                    <>
                                        <Link
                                            to={`/tests/${test.id}/edit`}
                                            style={{
                                                backgroundColor: '#FFC107',
                                                color: 'white',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '4px',
                                                textDecoration: 'none',
                                                marginRight: '0.5rem'
                                            }}
                                        >
                                            Редактировать
                                        </Link>
                                        <button
                                            onClick={() => handleDeleteTest(test.id)}
                                            style={{
                                                backgroundColor: '#F44336',
                                                color: 'white',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '4px',
                                                border: 'none',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Деактивировать
                                        </button>
                                    </>
                                ) : (
                                    <div>
                                        <button
                                            onClick={() => handleReactivateTest(test.id, false)}
                                            style={{
                                                backgroundColor: '#4CAF50',
                                                color: 'white',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '4px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                marginRight: '0.5rem'
                                            }}
                                        >
                                            Активировать
                                        </button>
                                        <button
                                            onClick={() => handleReactivateTest(test.id, true)}
                                            style={{
                                                backgroundColor: '#FF9800',
                                                color: 'white',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '4px',
                                                border: 'none',
                                                cursor: 'pointer',
                                                marginRight: '0.5rem'
                                            }}
                                        >
                                            Активировать и очистить
                                        </button>
                                        <button
                                            onClick={() => handlePermanentDeleteTest(test.id)}
                                            style={{
                                                backgroundColor: '#B71C1C',
                                                color: 'white',
                                                padding: '0.5rem 1rem',
                                                borderRadius: '4px',
                                                border: 'none',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Удалить навсегда
                                        </button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    if (loading) return <div>Загрузка тестов...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2>Список тестов</h2>
                {(user?.role === 'TEACHER' || user?.role === 'ADMIN') && (
                    <Link
                        to="/tests/create"
                        style={{
                            backgroundColor: '#4CAF50',
                            color: 'white',
                            padding: '0.5rem 1rem',
                            borderRadius: '4px',
                            textDecoration: 'none'
                        }}
                    >
                        Создать новый тест
                    </Link>
                )}
            </div>

            {renderTests()}
        </div>
    );
};

export default TestsList;