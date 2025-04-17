import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { Link } from 'react-router-dom';

const StudentStatisticsPage = () => {
    const { user } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statistics, setStatistics] = useState({});
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [selectedSubjectData, setSelectedSubjectData] = useState(null);

    // Цветовая схема
    const GRADE_COLORS = {
        excellent: '#10B981', // Зеленый
        good: '#3B82F6',      // Синий
        average: '#F59E0B',   // Оранжевый
        poor: '#EF4444'       // Красный
    };

    useEffect(() => {
        const fetchStudentStatistics = async () => {
            try {
                setLoading(true);
                const data = await api.get(`/statistics/student/${user.id}/performance`);
                setStatistics(data);

                // Create list of subjects from the data
                const subjectsList = Object.keys(data).map(subjectName => ({
                    id: data[subjectName].subjectId,
                    name: subjectName
                }));

                setSubjects(subjectsList);

                // Set default selected subject if available
                if (subjectsList.length > 0) {
                    setSelectedSubject(subjectsList[0].id);
                    setSelectedSubjectData(data[subjectsList[0].name]);
                }

                setLoading(false);
            } catch (err) {
                setError(err.message || 'Ошибка при загрузке статистики');
                setLoading(false);
            }
        };

        if (user && user.role === 'STUDENT') {
            fetchStudentStatistics();
        }
    }, [user]);

    const handleSubjectChange = (subjectId) => {
        setSelectedSubject(subjectId);
        const subject = subjects.find(s => s.id === parseInt(subjectId));
        if (subject) {
            setSelectedSubjectData(statistics[subject.name]);
        }
    };

    // Format date to dd.mm.yyyy
    const formatDate = (dateString) => {
        if (!dateString) return 'Н/Д';
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU');
    };

    // Helper to get performance text
    const getPerformanceText = (percentage) => {
        if (percentage >= 90) return 'Отлично';
        if (percentage >= 75) return 'Хорошо';
        if (percentage >= 60) return 'Удовлетворительно';
        return 'Требует улучшения';
    };

    // Helper to get color based on percentage
    const getPerformanceColor = (percentage) => {
        if (percentage >= 90) return GRADE_COLORS.excellent;
        if (percentage >= 75) return GRADE_COLORS.good;
        if (percentage >= 60) return GRADE_COLORS.average;
        return GRADE_COLORS.poor;
    };

    if (loading) {
        return (
            <div style={containerStyle}>
                <div style={headerStyle}>
                    <h2 style={titleStyle}>Моя статистика</h2>
                    <p style={subtitleStyle}>Загрузка данных...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={containerStyle}>
                <div style={headerStyle}>
                    <h2 style={titleStyle}>Моя статистика</h2>
                    <p style={subtitleStyle}>Произошла ошибка при загрузке данных</p>
                </div>
                <div style={errorContainerStyle}>
                    <p style={errorTitleStyle}>Произошла ошибка:</p>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    // Get aggregate stats across all subjects
    const aggregateStats = {
        totalTests: Object.values(statistics).reduce((sum, subject) => sum + (subject.completedTests || 0), 0),
        averagePerformance: Object.values(statistics).length > 0 ?
            Object.values(statistics).reduce((sum, subject) => sum + (subject.averagePercentage || 0), 0) / Object.values(statistics).length : 0
    };

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <h2 style={titleStyle}>Моя статистика</h2>
                <p style={subtitleStyle}>Отслеживайте свой прогресс и достижения</p>

                <div style={statsOverviewStyle}>
                    <div style={statsCardStyle}>
                        <div style={statsIconStyle}>🏆</div>
                        <div>
                            <p style={statsLabelStyle}>Средний результат</p>
                            <p style={statsValueStyle}>{aggregateStats.averagePerformance.toFixed(1)}%</p>
                        </div>
                    </div>

                    <div style={statsCardStyle}>
                        <div style={statsIconStyle}>✅</div>
                        <div>
                            <p style={statsLabelStyle}>Всего тестов</p>
                            <p style={statsValueStyle}>{aggregateStats.totalTests}</p>
                        </div>
                    </div>

                    <div style={statsCardStyle}>
                        <div style={statsIconStyle}>📚</div>
                        <div>
                            <p style={statsLabelStyle}>Изученных предметов</p>
                            <p style={statsValueStyle}>{Object.keys(statistics).length}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div style={sectionStyle}>
                <h3 style={sectionTitleStyle}>Общая успеваемость по предметам</h3>
                <div style={subjectsGridStyle}>
                    {Object.keys(statistics).length > 0 ? (
                        Object.entries(statistics).map(([subjectName, data]) => (
                            <div
                                key={data.subjectId}
                                style={{
                                    ...subjectCardStyle,
                                    borderTop: `3px solid ${getPerformanceColor(data.averagePercentage)}`
                                }}
                            >
                                <div style={subjectHeaderStyle}>
                                    <h4 style={subjectTitleStyle}>{subjectName}</h4>
                                    <span style={{
                                        ...badgeStyle,
                                        backgroundColor: getPerformanceColor(data.averagePercentage)
                                    }}>
                                        {getPerformanceText(data.averagePercentage)}
                                    </span>
                                </div>
                                <p style={subjectDescStyle}>{data.gradeName || 'Класс не указан'}</p>

                                <div style={subjectStatsContainerStyle}>
                                    <div style={subjectStatRowStyle}>
                                        <span>Средний результат:</span>
                                        <strong>{data.averagePercentage ? data.averagePercentage.toFixed(1) : '0.0'}%</strong>
                                    </div>
                                    <div style={{
                                        ...progressBarContainerStyle,
                                        backgroundColor: '#f0f0f0'
                                    }}>
                                        <div style={{
                                            ...progressBarStyle,
                                            width: `${data.averagePercentage || 0}%`,
                                            backgroundColor: getPerformanceColor(data.averagePercentage)
                                        }}></div>
                                    </div>
                                    <div style={subjectStatRowStyle}>
                                        <span>Выполнено тестов:</span>
                                        <strong>{data.completedTests || 0}</strong>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={noDataStyle}>
                            <p style={noDataTitleStyle}>Нет данных о выполненных тестах</p>
                            <p style={noDataSubtitleStyle}>Пройдите тесты, чтобы увидеть свою статистику</p>
                        </div>
                    )}
                </div>
            </div>

            <div style={sectionStyle}>
                <h3 style={sectionTitleStyle}>Детальная информация по предмету</h3>
                <div style={selectContainerStyle}>
                    <label htmlFor="subject-select" style={selectLabelStyle}>Выберите предмет:</label>
                    <select
                        id="subject-select"
                        value={selectedSubject ? selectedSubject.toString() : ''}
                        onChange={(e) => handleSubjectChange(e.target.value)}
                        style={selectStyle}
                    >
                        <option value="">Выберите предмет</option>
                        {subjects.map(subject => (
                            <option key={subject.id} value={subject.id.toString()}>
                                {subject.name}
                            </option>
                        ))}
                    </select>
                </div>

                {selectedSubjectData && selectedSubjectData.testStats && selectedSubjectData.testStats.length > 0 ? (
                    <div style={tableContainerStyle}>
                        <table style={tableStyle}>
                            <thead>
                            <tr>
                                <th style={thStyle}>Тест</th>
                                <th style={thStyle}>Баллы</th>
                                <th style={thStyle}>Результат</th>
                                <th style={thStyle}>Дата</th>
                                <th style={thStyle}>Попытка</th>
                            </tr>
                            </thead>
                            <tbody>
                            {selectedSubjectData.testStats.map((test, index) => (
                                <tr key={`${test.testId}-${index}`} style={trStyle}>
                                    <td style={tdStyle}>{test.testTitle}</td>
                                    <td style={tdStyle}>{test.score || 0} / {test.maxScore || 0}</td>
                                    <td style={tdStyle}>
                                            <span style={{
                                                ...badgeStyle,
                                                backgroundColor: getPerformanceColor(test.percentage || 0)
                                            }}>
                                                {test.percentage ? test.percentage.toFixed(1) : '0.0'}%
                                            </span>
                                    </td>
                                    <td style={tdStyle}>{formatDate(test.completedAt)}</td>
                                    <td style={tdStyle}>
                                            <span style={attemptBadgeStyle}>
                                                #{test.attemptNumber || 1}
                                            </span>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div style={noDataStyle}>
                        <p style={noDataTitleStyle}>
                            {!selectedSubject
                                ? 'Выберите предмет для просмотра результатов тестов'
                                : 'Нет данных о выполненных тестах по этому предмету'}
                        </p>
                        <p style={noDataSubtitleStyle}>
                            {!selectedSubject
                                ? 'Используйте выпадающий список выше'
                                : 'Пройдите тесты, чтобы увидеть свою статистику'}
                        </p>
                    </div>
                )}
            </div>

            <div style={actionContainerStyle}>
                <Link to="/statistics" style={buttonStyle}>Назад к выбору статистики</Link>
                <Link to="/" style={buttonStyle}>На главную</Link>
            </div>
        </div>
    );
};

// Стили
const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
    padding: '2rem'
};

const headerStyle = {
    backgroundColor: '#3b82f6',
    padding: '2rem',
    borderRadius: '8px',
    color: 'white'
};

const titleStyle = {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '0.5rem'
};

const subtitleStyle = {
    opacity: '0.8',
    marginBottom: '1.5rem'
};

const statsOverviewStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem'
};

const statsCardStyle = {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: '1rem',
    borderRadius: '8px',
    flex: '1 1 200px'
};

const statsIconStyle = {
    fontSize: '1.5rem',
    marginRight: '1rem'
};

const statsLabelStyle = {
    fontSize: '0.875rem',
    opacity: '0.8'
};

const statsValueStyle = {
    fontSize: '1.25rem',
    fontWeight: 'bold'
};

const sectionStyle = {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 0 10px rgba(0,0,0,0.1)'
};

const sectionTitleStyle = {
    marginBottom: '1.5rem'
};

const subjectsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1rem'
};

const subjectCardStyle = {
    backgroundColor: '#f5f7fa',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
};

const subjectHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
};

const subjectTitleStyle = {
    margin: '0',
    fontSize: '1.125rem'
};

const badgeStyle = {
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    color: 'white',
    fontSize: '0.75rem',
    fontWeight: 'bold'
};

const subjectDescStyle = {
    color: '#666',
    fontSize: '0.875rem',
    marginBottom: '1rem'
};

const subjectStatsContainerStyle = {
    marginTop: '1rem'
};

const subjectStatRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '0.5rem',
    fontSize: '0.875rem'
};

const progressBarContainerStyle = {
    height: '8px',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '1rem'
};

const progressBarStyle = {
    height: '100%',
    transition: 'width 0.3s ease'
};

const selectContainerStyle = {
    marginBottom: '1.5rem'
};

const selectLabelStyle = {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: 'bold'
};

const selectStyle = {
    width: '100%',
    maxWidth: '300px',
    padding: '0.5rem',
    borderRadius: '4px',
    border: '1px solid #ddd'
};

const tableContainerStyle = {
    overflowX: 'auto'
};

const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse'
};

const thStyle = {
    textAlign: 'left',
    padding: '0.75rem',
    backgroundColor: '#f5f7fa',
    fontWeight: 'bold',
    borderBottom: '2px solid #eee'
};

const tdStyle = {
    padding: '0.75rem',
    borderBottom: '1px solid #eee'
};

const trStyle = {
    transition: 'background-color 0.2s ease',
    cursor: 'pointer',
    ':hover': {
        backgroundColor: '#f8f9fa'
    }
};

const attemptBadgeStyle = {
    backgroundColor: '#f0f0f0',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.75rem'
};

const noDataStyle = {
    backgroundColor: '#f5f7fa',
    padding: '3rem',
    borderRadius: '8px',
    textAlign: 'center'
};

const noDataTitleStyle = {
    color: '#666',
    fontSize: '1.125rem',
    marginBottom: '0.5rem'
};

const noDataSubtitleStyle = {
    color: '#888',
    fontSize: '0.875rem'
};

const actionContainerStyle = {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'center',
    marginTop: '1rem'
};

const buttonStyle = {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '4px',
    textDecoration: 'none',
    fontWeight: 'bold',
    transition: 'background-color 0.2s ease'
};

const errorContainerStyle = {
    backgroundColor: '#fee2e2',
    color: '#b91c1c',
    padding: '1rem',
    borderRadius: '8px',
    border: '1px solid #fecaca'
};

const errorTitleStyle = {
    fontWeight: 'bold',
    marginBottom: '0.5rem'
};

export default StudentStatisticsPage;