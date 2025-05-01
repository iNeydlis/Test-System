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

    // Состояние для отслеживания развернутых учеников
    const [expandedStudents, setExpandedStudents] = useState({});

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
        if (!result) return 0;

        // Check if we have score data
        const hasScoreData = typeof result.score !== 'undefined' &&
            typeof result.maxScore !== 'undefined' &&
            result.maxScore > 0;

        // Check if we have correctAnswers data
        const hasAnswersData = typeof result.correctAnswers !== 'undefined' &&
            typeof result.totalQuestions !== 'undefined' &&
            result.totalQuestions > 0;

        if (hasScoreData) {
            return calculateScorePercentage(result.score, result.maxScore);
        } else if (hasAnswersData) {
            return calculatePercentage(result.correctAnswers, result.totalQuestions);
        } else {
            return 0; // Default if no valid data available
        }
    };

    // Handle sorting
    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        console.log(`Sorting by ${key} in ${direction} direction`);
        setSortConfig({ key, direction });
    };

    // Функция для переключения состояния развернутости студента
    const toggleStudentExpand = (studentId) => {
        setExpandedStudents(prev => ({
            ...prev,
            [studentId]: !prev[studentId]
        }));
    };

// Get sorted and filtered results
    const filteredAndSortedResults = useMemo(() => {
        // First apply search filter
        let filteredResults = [...results].filter(result => result !== null && typeof result === 'object');

        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            filteredResults = filteredResults.filter(result => {
                if (user?.role === 'STUDENT') {
                    // For students, search in test titles
                    const testTitle = (result.testTitle || result.test?.title || '').toLowerCase();
                    return testTitle.includes(searchLower);
                } else {
                    // For teachers/admins, search in student names
                    const studentName = (result.studentName || result.student?.name || '').toLowerCase();
                    return studentName.includes(searchLower);
                }
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
        const sortedResults = [...filteredResults].sort((a, b) => {
            if (sortConfig.key === 'name') {
                // For students, sort by test title; for teachers, sort by student name
                const nameA = user?.role === 'STUDENT'
                    ? (a.testTitle || a.test?.title || '').toLowerCase()
                    : (a.studentName || a.student?.name || '').toLowerCase();
                const nameB = user?.role === 'STUDENT'
                    ? (b.testTitle || b.test?.title || '').toLowerCase()
                    : (b.studentName || b.student?.name || '').toLowerCase();

                return sortConfig.direction === 'asc'
                    ? nameA.localeCompare(nameB)
                    : nameB.localeCompare(nameA);
            }

            if (sortConfig.key === 'completedAt') {
                const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
                const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;

                return sortConfig.direction === 'asc'
                    ? dateA - dateB
                    : dateB - dateA;
            }

            if (sortConfig.key === 'percentage') {
                const percentageA = getResultPercentage(a);
                const percentageB = getResultPercentage(b);

                return sortConfig.direction === 'asc'
                    ? percentageA - percentageB
                    : percentageB - percentageA;
            }

            return 0;
        });

        console.log("Sorted results:", sortedResults);
        console.log("Sort config:", sortConfig);

        return sortedResults;
    }, [results, sortConfig, searchTerm, filterStatus, user?.role]);

    // Группировка результатов по студентам для учителей
    const studentResultsMap = useMemo(() => {
        if (user?.role !== 'TEACHER' && user?.role !== 'ADMIN') {
            return null;
        }

        // Начнем с исходных результатов, чтобы правильно группировать
        const map = {};
        const filteredMap = {};

        // Сначала сгруппируем все результаты по студентам
        results.forEach(result => {
            if (!result) return;

            const studentId = result.studentId || result.student?.id;
            const studentName = result.studentName || result.student?.name || 'Неизвестно';

            // Если у нас нет идентификатора студента, используем имя как ключ
            const key = studentId ? studentId.toString() : `name-${studentName}`;

            if (!map[key]) {
                map[key] = {
                    studentId: studentId,
                    studentName: studentName,
                    results: []
                };
            }

            map[key].results.push(result);
        });

        // Сортируем результаты для каждого студента по проценту
        Object.keys(map).forEach(key => {
            map[key].results.sort((a, b) => {
                const percentageA = getResultPercentage(a);
                const percentageB = getResultPercentage(b);
                return percentageB - percentageA; // По убыванию (лучший результат первый)
            });
        });

        // Применяем поиск по имени студента
        Object.keys(map).forEach(key => {
            const studentData = map[key];
            const studentName = studentData.studentName.toLowerCase();

            if (!searchTerm || studentName.includes(searchTerm.toLowerCase())) {
                // Применяем фильтрацию по статусу только к студентам, подходящим под поиск
                if (filterStatus === 'all') {
                    // Если не фильтруем по статусу, добавляем студента
                    filteredMap[key] = studentData;
                } else {
                    // Проверяем, что лучший результат студента соответствует фильтру статуса
                    const bestResult = studentData.results[0];
                    const percentage = getResultPercentage(bestResult);

                    let matchesFilter = false;

                    if (filterStatus === 'excellent' && percentage >= 90) matchesFilter = true;
                    else if (filterStatus === 'good' && percentage >= 75 && percentage < 90) matchesFilter = true;
                    else if (filterStatus === 'satisfactory' && percentage >= 60 && percentage < 75) matchesFilter = true;
                    else if (filterStatus === 'unsatisfactory' && percentage < 60) matchesFilter = true;

                    if (matchesFilter) {
                        filteredMap[key] = studentData;
                    }
                }
            }
        });

        return filteredMap;
    }, [results, searchTerm, filterStatus, user?.role]);

    const sortedStudentEntries = useMemo(() => {
        if (!studentResultsMap) return [];
        const entries = Object.entries(studentResultsMap);
        return entries.sort((a, b) => {
            const studentA = a[1]; // Данные студента A
            const studentB = b[1]; // Данные студента B

            if (sortConfig.key === 'name') {
                const nameA = studentA.studentName.toLowerCase();
                const nameB = studentB.studentName.toLowerCase();
                return sortConfig.direction === 'asc'
                    ? nameA.localeCompare(nameB)
                    : nameB.localeCompare(nameA);
            }

            if (sortConfig.key === 'completedAt') {
                const dateA = studentA.results[0]?.completedAt ? new Date(studentA.results[0].completedAt).getTime() : 0;
                const dateB = studentB.results[0]?.completedAt ? new Date(studentB.results[0].completedAt).getTime() : 0;
                return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
            }

            if (sortConfig.key === 'percentage') {
                const percentageA = getResultPercentage(studentA.results[0]);
                const percentageB = getResultPercentage(studentB.results[0]);
                return sortConfig.direction === 'asc' ? percentageA - percentageB : percentageB - percentageA;
            }

            return 0;
        });
    }, [studentResultsMap, sortConfig]);

    // Для группировки результатов (упрощено, без группировки по статусу и дате)
    const groupedResults = useMemo(() => {
        // Всегда возвращаем один объект с ключом 'Все результаты'
        return { 'Все результаты': filteredAndSortedResults };
    }, [filteredAndSortedResults]);

    // Debug: Check results state
    console.log("Current results state:", results);
    console.log("Results length:", results.length);
    console.log("Filtered and sorted results:", filteredAndSortedResults);
    console.log("Student results map:", studentResultsMap);

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
        },
        expandButton: {
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.2rem',
            color: '#2196F3',
            marginRight: '0.5rem'
        },
        studentRow: {
            backgroundColor: '#f9f9f9'
        },
        bestResultRow: {
            fontWeight: 'bold'
        },
        otherResultRow: {
            backgroundColor: '#f5f5f5'
        }
    };

    if (loading) return <div>Загрузка результатов...</div>;
    if (error) return <div className="error-message">{error}</div>;



    return (
        <div>


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
                            console.log(`Dropdown sort: ${key} ${direction}`);
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



            {filteredAndSortedResults.length === 0 ? (
                <p>Нет доступных результатов{searchTerm ? ' по вашему запросу' : ''}.</p>
            ) : (
                <div>
                    {/* Отображение для учителей с группировкой по ученикам */}
                    {studentResultsMap ? (
                        <table style={{
                            width: '100%',
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                            borderCollapse: 'collapse',
                            marginTop: '1.5rem',
                            marginBottom: '1.5rem'
                        }}>
                            <thead>
                            <tr>
                                <th style={{...styles.tableHeader, width: '40px'}}></th>
                                <th style={styles.tableHeader} onClick={() => requestSort('name')}>
                                    Ученик
                                    <span style={styles.sortIcon('name')}>
                        {sortConfig.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}
                    </span>
                                </th>
                                <th style={styles.tableHeader} onClick={() => requestSort('completedAt')}>
                                    Дата
                                    <span style={styles.sortIcon('completedAt')}>
                        {sortConfig.key === 'completedAt' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}
                    </span>
                                </th>
                                <th style={{...styles.tableHeader, textAlign: 'center'}} onClick={() => requestSort('percentage')}>
                                    Результат
                                    <span style={styles.sortIcon('percentage')}>
                        {sortConfig.key === 'percentage' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '⇅'}
                    </span>
                                </th>
                                <th style={{...styles.tableHeader, textAlign: 'center'}}>Статус</th>
                                <th style={{...styles.tableHeader, textAlign: 'center'}}>Действия</th>
                            </tr>
                            </thead>
                            <tbody>
                            {sortedStudentEntries.map(([studentKey, studentData]) => {
                                const allResults = studentData.results;
                                const bestResult = allResults[0];
                                const hasMultipleResults = allResults.length > 1;
                                const isExpanded = expandedStudents[studentKey];

                                const hasScoreData = typeof bestResult.score !== 'undefined' && typeof bestResult.maxScore !== 'undefined';
                                const bestPercentage = hasScoreData
                                    ? calculateScorePercentage(bestResult.score, bestResult.maxScore)
                                    : calculatePercentage(bestResult.correctAnswers, bestResult.totalQuestions);
                                const status = getStatusClass(bestPercentage);

                                return (
                                    <React.Fragment key={studentKey}>
                                        <tr style={styles.bestResultRow}>
                                            <td style={{ textAlign: 'center', padding: '0.5rem', borderBottom: '1px solid #eee' }}>
                                                {hasMultipleResults && (
                                                    <button
                                                        style={styles.expandButton}
                                                        onClick={() => toggleStudentExpand(studentKey)}
                                                        title={isExpanded ? "Свернуть результаты" : "Показать все результаты"}
                                                    >
                                                        {isExpanded ? '−' : '+'}
                                                    </button>
                                                )}
                                            </td>
                                            <td style={{ padding: '1rem', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>
                                                {studentData.studentName}
                                                {hasMultipleResults && (
                                                    <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: '0.5rem' }}>
                                        (лучший из {allResults.length})
                                    </span>
                                                )}
                                            </td>
                                            <td style={{ padding: '1rem', borderBottom: '1px solid #eee' }}>
                                                {bestResult.completedAt ? new Date(bestResult.completedAt).toLocaleString() : '-'}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                                                {hasScoreData
                                                    ? `${bestResult.score} / ${bestResult.maxScore} (${bestPercentage}%)`
                                                    : `${bestResult.correctAnswers || 0} / ${bestResult.totalQuestions || 0} (${bestPercentage}%)`}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #eee', color: status.color, fontWeight: 'bold' }}>
                                                {status.text}
                                            </td>
                                            <td style={{ padding: '1rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                                                <Link
                                                    to={`/tests/teacher-result/${bestResult.id}`}
                                                    style={{ backgroundColor: '#2196F3', color: 'white', padding: '0.5rem 1rem', borderRadius: '4px', textDecoration: 'none' }}
                                                >
                                                    Подробнее
                                                </Link>
                                            </td>
                                        </tr>
                                        {isExpanded && hasMultipleResults && allResults.slice(1).map((result, index) => {
                                            const resultPercentage = getResultPercentage(result);
                                            const resultStatus = getStatusClass(resultPercentage);
                                            const hasScoreData = typeof result.score !== 'undefined' && typeof result.maxScore !== 'undefined';

                                            return (
                                                <tr key={`${studentKey}-${index}`} style={styles.otherResultRow}>
                                                    <td style={{ borderBottom: '1px solid #eee' }}></td>
                                                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #eee', paddingLeft: '2rem' }}>
                                        <span style={{ fontSize: '0.9rem', color: '#666' }}>
                                            Попытка #{index + 2}
                                        </span>
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #eee' }}>
                                                        {result.completedAt ? new Date(result.completedAt).toLocaleString() : '-'}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                                                        {hasScoreData
                                                            ? `${result.score} / ${result.maxScore} (${resultPercentage}%)`
                                                            : `${result.correctAnswers || 0} / ${result.totalQuestions || 0} (${resultPercentage}%)`}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', borderBottom: '1px solid #eee', color: resultStatus.color }}>
                                                        {resultStatus.text}
                                                    </td>
                                                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                                                        <Link
                                                            to={`/tests/teacher-result/${result.id}`}
                                                            style={{ backgroundColor: '#9E9E9E', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '4px', textDecoration: 'none', fontSize: '0.9rem' }}
                                                        >
                                                            Подробнее
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            })}
                            </tbody>
                        </table>
                    ) : (
                        // Стандартное отображение (для студентов или без группировки по ученикам)
                        Object.entries(groupedResults).map(([groupName, groupItems]) => (
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
                        ))
                    )}

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