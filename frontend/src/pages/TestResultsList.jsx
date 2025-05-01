import React, { useState, useEffect, useContext, useMemo } from 'react';
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

    // Состояния для сортировки, фильтрации и группировки
    const [sortConfig, setSortConfig] = useState({ key: 'completedAt', direction: 'desc' });
    const [searchTerm, setSearchTerm] = useState('');
    const [groupBy, setGroupBy] = useState('none');
    const [filterStatus, setFilterStatus] = useState('all');

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

    // Function to get percentage for a result
    const getResultPercentage = (result) => {
        const hasScoreData = typeof result.score !== 'undefined' && typeof result.maxScore !== 'undefined';
        return hasScoreData
            ? calculateScorePercentage(result.score, result.maxScore)
            : calculatePercentage(result.correctAnswers, result.totalQuestions);
    };

    // Handle sorting
    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    // Get sorted and filtered results
    const filteredAndSortedResults = useMemo(() => {
        // First apply search filter
        let filteredResults = [...results];

        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            filteredResults = filteredResults.filter(result => {
                const testTitle = (result.testTitle || result.test?.title || '').toLowerCase();
                const studentName = (result.studentName || result.student?.name || '').toLowerCase();
                const searchTarget = user?.role === 'STUDENT' ? testTitle : studentName;
                return searchTarget.includes(searchLower);
            });
        }

        // Then apply status filter
        if (filterStatus !== 'all') {
            filteredResults = filteredResults.filter(result => {
                const percentage = getResultPercentage(result);
                if (filterStatus === 'excellent') return percentage >= 90;
                if (filterStatus === 'good') return percentage >= 75 && percentage < 90;
                if (filterStatus === 'satisfactory') return percentage >= 60 && percentage < 75;
                if (filterStatus === 'unsatisfactory') return percentage < 60;
                return true;
            });
        }

        // Then sort
        return filteredResults.sort((a, b) => {
            if (sortConfig.key === 'name') {
                const nameA = user?.role === 'STUDENT'
                    ? (a.testTitle || a.test?.title || '').toLowerCase()
                    : (a.studentName || a.student?.name || '').toLowerCase();
                const nameB = user?.role === 'STUDENT'
                    ? (b.testTitle || b.test?.title || '').toLowerCase()
                    : (b.studentName || b.student?.name || '').toLowerCase();

                if (sortConfig.direction === 'asc') {
                    return nameA.localeCompare(nameB);
                } else {
                    return nameB.localeCompare(nameA);
                }
            }

            if (sortConfig.key === 'completedAt') {
                const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
                const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;

                if (sortConfig.direction === 'asc') {
                    return dateA - dateB;
                } else {
                    return dateB - dateA;
                }
            }

            if (sortConfig.key === 'percentage') {
                const percentageA = getResultPercentage(a);
                const percentageB = getResultPercentage(b);

                if (sortConfig.direction === 'asc') {
                    return percentageA - percentageB;
                } else {
                    return percentageB - percentageA;
                }
            }

            return 0;
        });
    }, [results, sortConfig, searchTerm, filterStatus, user?.role]);

    // For grouping results
    const groupedResults = useMemo(() => {
        if (groupBy === 'none') {
            return { 'Все результаты': filteredAndSortedResults };
        }

        const groups = {};

        if (groupBy === 'status') {
            filteredAndSortedResults.forEach(result => {
                const percentage = getResultPercentage(result);
                const status = getStatusClass(percentage).text;
                if (!groups[status]) groups[status] = [];
                groups[status].push(result);
            });
        } else if (groupBy === 'date') {
            filteredAndSortedResults.forEach(result => {
                if (!result.completedAt) {
                    if (!groups['Без даты']) groups['Без даты'] = [];
                    groups['Без даты'].push(result);
                    return;
                }

                const date = new Date(result.completedAt);
                const formattedDate = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;

                if (!groups[formattedDate]) groups[formattedDate] = [];
                groups[formattedDate].push(result);
            });
        }

        return groups;
    }, [filteredAndSortedResults, groupBy]);

    // Debug: Check results state
    console.log("Current results state:", results);
    console.log("Results length:", results.length);
    console.log("Filtered and sorted results:", filteredAndSortedResults);

    // Styles for UI components
    const styles = {
        controlPanel: {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem',
            backgroundColor: '#f9f9f9',
            padding: '1rem',
            borderRadius: '8px'
        },
        select: {
            padding: '0.5rem',
            borderRadius: '4px',
            border: '1px solid #ddd',
            width: '100%'
        },
        inputSearch: {
            padding: '0.5rem',
            borderRadius: '4px',
            border: '1px solid #ddd',
            width: '100%'
        },
        tableHeader: {
            padding: '1rem',
            textAlign: 'left',
            borderBottom: '1px solid #eee',
            cursor: 'pointer',
            userSelect: 'none',
            position: 'relative'
        },
        sortIcon: (key) => ({
            marginLeft: '5px',
            color: sortConfig.key === key ? '#2196F3' : '#ccc'
        }),
        groupHeader: {
            backgroundColor: '#f5f5f5',
            padding: '0.75rem 1rem',
            fontWeight: 'bold',
            borderBottom: '1px solid #eee',
            borderTop: '1px solid #eee',
            marginTop: '1rem'
        }
    };

    if (loading) return <div>Загрузка результатов...</div>;
    if (error) return <div className="error-message">{error}</div>;

    return (
        <div>
            <h2>
                {`Результаты теста`}
            </h2>

            {/* Control panel */}
            <div style={styles.controlPanel}>
                <div>
                    <label htmlFor="search">Поиск:</label>
                    <input
                        id="search"
                        type="text"
                        style={styles.inputSearch}
                        placeholder={`Поиск по ${user?.role === 'STUDENT' ? 'тестам' : 'ученикам'}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="sort">Сортировка:</label>
                    <select
                        id="sort"
                        style={styles.select}
                        value={`${sortConfig.key}-${sortConfig.direction}`}
                        onChange={(e) => {
                            const [key, direction] = e.target.value.split('-');
                            setSortConfig({ key, direction });
                        }}
                    >
                        <option value="name-asc">{user?.role === 'STUDENT' ? 'Тест (А-Я)' : 'Ученик (А-Я)'}</option>
                        <option value="name-desc">{user?.role === 'STUDENT' ? 'Тест (Я-А)' : 'Ученик (Я-А)'}</option>
                        <option value="completedAt-desc">Дата (новые)</option>
                        <option value="completedAt-asc">Дата (старые)</option>
                        <option value="percentage-desc">Результат (высокий-низкий)</option>
                        <option value="percentage-asc">Результат (низкий-высокий)</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="group">Группировка:</label>
                    <select
                        id="group"
                        style={styles.select}
                        value={groupBy}
                        onChange={(e) => setGroupBy(e.target.value)}
                    >
                        <option value="none">Без группировки</option>
                        <option value="status">По статусу</option>
                        <option value="date">По дате</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="filter">Статус:</label>
                    <select
                        id="filter"
                        style={styles.select}
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">Все результаты</option>
                        <option value="excellent">Отлично</option>
                        <option value="good">Хорошо</option>
                        <option value="satisfactory">Удовлетворительно</option>
                        <option value="unsatisfactory">Неудовлетворительно</option>
                    </select>
                </div>
            </div>

            {/* Debug info */}
            <div style={{ marginBottom: '1rem', color: 'gray', fontSize: '0.9rem' }}>
                Загружено результатов: {results.length} | Показано: {filteredAndSortedResults.length}
            </div>

            {filteredAndSortedResults.length === 0 ? (
                <p>Нет доступных результатов{searchTerm ? ' по вашему запросу' : ''}.</p>
            ) : (
                <div>
                    {Object.entries(groupedResults).map(([groupName, groupItems]) => (
                        <div key={groupName}>
                            {groupBy !== 'none' && groupItems.length > 0 && (
                                <div style={styles.groupHeader}>{groupName} ({groupItems.length})</div>
                            )}

                            <table style={{
                                width: '100%',
                                backgroundColor: 'white',
                                borderRadius: '8px',
                                boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                                borderCollapse: 'collapse',
                                marginTop: groupBy === 'none' ? '1.5rem' : '0.5rem',
                                marginBottom: '1.5rem'
                            }}>
                                <thead>
                                <tr>
                                    <th
                                        style={styles.tableHeader}
                                        onClick={() => requestSort('name')}
                                    >
                                        {user?.role === 'STUDENT' ? 'Тест' : 'Ученик'}
                                        <span style={styles.sortIcon('name')}>
                                            {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}
                                        </span>
                                    </th>
                                    <th
                                        style={styles.tableHeader}
                                        onClick={() => requestSort('completedAt')}
                                    >
                                        Дата
                                        <span style={styles.sortIcon('completedAt')}>
                                            {sortConfig.key === 'completedAt' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}
                                        </span>
                                    </th>
                                    <th
                                        style={{...styles.tableHeader, textAlign: 'center'}}
                                        onClick={() => requestSort('percentage')}
                                    >
                                        Результат
                                        <span style={styles.sortIcon('percentage')}>
                                            {sortConfig.key === 'percentage' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}
                                        </span>
                                    </th>
                                    <th style={{...styles.tableHeader, textAlign: 'center'}}>
                                        Статус
                                    </th>
                                    <th style={{...styles.tableHeader, textAlign: 'center'}}>
                                        Действия
                                    </th>
                                </tr>
                                </thead>
                                <tbody>
                                {groupItems.map((result) => {
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
                        </div>
                    ))}

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