import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { Link } from 'react-router-dom';

const TeacherAdminStatisticsPage = () => {
    const { user } = useContext(AuthContext);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statistics, setStatistics] = useState({});
    const [grades, setGrades] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [tests, setTests] = useState([]);
    const [selectedView, setSelectedView] = useState('school'); // school, subject, grade, test
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [selectedGrade, setSelectedGrade] = useState(null);
    const [selectedTest, setSelectedTest] = useState(null);
    const [viewData, setViewData] = useState(null);

    // Цветовая схема
    const GRADE_COLORS = {
        excellent: '#10B981', // Зеленый
        good: '#3B82F6',      // Синий
        average: '#F59E0B',   // Оранжевый
        poor: '#EF4444'       // Красный
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoading(true);

                // Fetch grades, subjects, and tests data
                const gradesData = await api.get('/grades');
                const subjectsData = await api.get('/subjects');
                const testsData = await api.get('/tests');

                // Filter data for teachers based on their assigned subjects and grades
                if (user.role === 'TEACHER') {
                    // Filter subjects to only include those the teacher teaches
                    const filteredSubjects = subjectsData.filter(subject =>
                        user.subjectNames && user.subjectNames.includes(subject.name)
                    );

                    // Filter grades to only include those the teacher teaches
                    const filteredGrades = gradesData.filter(grade =>
                        user.teachingGradeNames && user.teachingGradeNames.includes(grade.fullName)
                    );

                    // For tests, we might need to filter based on subject and grade
                    // This might require a more complex API call or additional filtering
                    // For now, we'll keep all tests and filter them on the UI level

                    setGrades(filteredGrades);
                    setSubjects(filteredSubjects);
                } else {
                    // For admins, show all data
                    setGrades(gradesData);
                    setSubjects(subjectsData);
                }

                setTests(testsData);

                // Fetch school-level statistics by default
                const schoolStatsData = await api.get('/statistics/school/top-students');
                setViewData(schoolStatsData);

                setLoading(false);
            } catch (err) {
                setError(err.message || 'Ошибка при загрузке данных');
                setLoading(false);
            }
        };

        if (user && (user.role === 'TEACHER' || user.role === 'ADMIN')) {
            fetchInitialData();
        }
    }, [user]);

    const fetchStatisticsByView = async () => {
        try {
            setLoading(true);
            let data = null;

            switch(selectedView) {
                case 'school':
                    // For teachers, we might want to limit this to their students only
                    if (user.role === 'TEACHER') {
                        // This endpoint might need to be updated on the backend to support teacher-specific filtering
                        data = await api.get('/statistics/school/top-students', {
                            params: {
                                teacherId: user.id
                            }
                        });
                    } else {
                        data = await api.get('/statistics/school/top-students');
                    }
                    break;
                case 'subject':
                    if (selectedSubject) {
                        data = await api.get(`/statistics/subject/${selectedSubject}`);
                    }
                    break;
                case 'grade':
                    if (selectedGrade) {
                        data = await api.get(`/statistics/grade/${selectedGrade}`);
                    }
                    break;
                case 'test':
                    if (selectedTest) {
                        // For teachers, we might want to limit this to their tests only
                        // This depends on how your API is structured
                        data = await api.get(`/statistics/test/${selectedTest}`);
                    }
                    break;
                default:
                    break;
            }

            if (data) {
                setViewData(data);
            }

            setLoading(false);
        } catch (err) {
            setError(err.message || 'Ошибка при загрузке статистики');
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && (user.role === 'TEACHER' || user.role === 'ADMIN')) {
            fetchStatisticsByView();
        }
    }, [selectedView, selectedSubject, selectedGrade, selectedTest]);

    const handleViewChange = (view) => {
        setSelectedView(view);
        // Reset selections when changing view
        if (view !== 'subject') setSelectedSubject(null);
        if (view !== 'grade') setSelectedGrade(null);
        if (view !== 'test') setSelectedTest(null);
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

    // Filter tests based on selected subject and grade for teachers
    const getFilteredTests = () => {
        if (user.role !== 'TEACHER' || !user.subjectNames || !user.teachingGradeNames) {
            return tests;
        }

        // Since test data might not have direct subject/grade names like we need,
        // we'll show all tests for now - ideally the backend would filter these
        // Based on what's shown in the code, tests might not have subjectName/gradeName directly
        return tests;

        /* When the API provides these fields, you can uncomment this:
        return tests.filter(test => {
            // Check if test is associated with a subject that the teacher teaches
            const isTeachersSubject = test.subjectName &&
                user.subjectNames.includes(test.subjectName);

            // Check if test is for a grade that the teacher teaches
            const isTeachersGrade = test.gradeName &&
                user.teachingGradeNames.includes(test.gradeName);

            return isTeachersSubject && isTeachersGrade;
        });
        */
    };

    if (loading) {
        return (
            <div style={containerStyle}>
                <div style={headerStyle}>
                    <h2 style={titleStyle}>Статистика обучения</h2>
                    <p style={subtitleStyle}>Загрузка данных...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div style={containerStyle}>
                <div style={headerStyle}>
                    <h2 style={titleStyle}>Статистика обучения</h2>
                    <p style={subtitleStyle}>Произошла ошибка при загрузке данных</p>
                </div>
                <div style={errorContainerStyle}>
                    <p style={errorTitleStyle}>Произошла ошибка:</p>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>
                <h2 style={titleStyle}>Статистика обучения</h2>
                <p style={subtitleStyle}>Анализ успеваемости учащихся и результатов тестирования</p>

                {viewData && (
                    <div style={statsOverviewStyle}>
                        <div style={statsCardStyle}>
                            <div style={statsIconStyle}>🏆</div>
                            <div>
                                <p style={statsLabelStyle}>Средний результат</p>
                                <p style={statsValueStyle}>{viewData.averageScore ? viewData.averageScore.toFixed(1) : '0.0'}%</p>
                            </div>
                        </div>


                        <div style={statsCardStyle}>
                            <div style={statsIconStyle}>👥</div>
                            <div>
                                <p style={statsLabelStyle}>Количество учеников</p>
                                <p style={statsValueStyle}>{viewData.totalStudents || 0}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div style={sectionStyle}>
                <h3 style={sectionTitleStyle}>Выбор статистики</h3>

                <div style={viewSelectorStyle}>
                    <button
                        style={{
                            ...viewButtonStyle,
                            backgroundColor: selectedView === 'school' ? '#3b82f6' : '#f5f7fa',
                            color: selectedView === 'school' ? 'white' : '#333'
                        }}
                        onClick={() => handleViewChange('school')}
                    >
                        По школе
                    </button>
                    <button
                        style={{
                            ...viewButtonStyle,
                            backgroundColor: selectedView === 'subject' ? '#3b82f6' : '#f5f7fa',
                            color: selectedView === 'subject' ? 'white' : '#333'
                        }}
                        onClick={() => handleViewChange('subject')}
                    >
                        По предмету
                    </button>
                    <button
                        style={{
                            ...viewButtonStyle,
                            backgroundColor: selectedView === 'grade' ? '#3b82f6' : '#f5f7fa',
                            color: selectedView === 'grade' ? 'white' : '#333'
                        }}
                        onClick={() => handleViewChange('grade')}
                    >
                        По классу
                    </button>
                    <button
                        style={{
                            ...viewButtonStyle,
                            backgroundColor: selectedView === 'test' ? '#3b82f6' : '#f5f7fa',
                            color: selectedView === 'test' ? 'white' : '#333'
                        }}
                        onClick={() => handleViewChange('test')}
                    >
                        По тесту
                    </button>
                </div>

                {selectedView === 'subject' && (
                    <div style={selectContainerStyle}>
                        <label htmlFor="subject-select" style={selectLabelStyle}>Выберите предмет:</label>
                        <select
                            id="subject-select"
                            value={selectedSubject || ''}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            style={selectStyle}
                        >
                            <option value="">Выберите предмет</option>
                            {subjects.map(subject => (
                                <option key={subject.id} value={subject.id}>
                                    {subject.name}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {selectedView === 'grade' && (
                    <div style={selectContainerStyle}>
                        <label htmlFor="grade-select" style={selectLabelStyle}>Выберите класс:</label>
                        <select
                            id="grade-select"
                            value={selectedGrade || ''}
                            onChange={(e) => setSelectedGrade(e.target.value)}
                            style={selectStyle}
                        >
                            <option value="">Выберите класс</option>
                            {grades.map(grade => (
                                <option key={grade.id} value={grade.id}>
                                    {grade.fullName}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {selectedView === 'test' && (
                    <div style={selectContainerStyle}>
                        <label htmlFor="test-select" style={selectLabelStyle}>Выберите тест:</label>
                        <select
                            id="test-select"
                            value={selectedTest || ''}
                            onChange={(e) => setSelectedTest(e.target.value)}
                            style={selectStyle}
                        >
                            <option value="">Выберите тест</option>
                            {getFilteredTests().map(test => (
                                <option key={test.id} value={test.id}>
                                    {test.title}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {viewData && (
                <div style={sectionStyle}>
                    <h3 style={sectionTitleStyle}>
                        {selectedView === 'school' && 'Рейтинг лучших учеников'}
                        {selectedView === 'subject' && viewData.subjectName && `Статистика по предмету: ${viewData.subjectName}`}
                        {selectedView === 'grade' && viewData.gradeName && `Статистика по классу: ${viewData.gradeName}`}
                        {selectedView === 'test' && viewData.testTitle && `Статистика по тесту: ${viewData.testTitle}`}
                    </h3>

                    {viewData.userStats && viewData.userStats.length > 0 ? (
                        <div style={tableContainerStyle}>
                            <table style={tableStyle}>
                                <thead>
                                <tr>
                                    <th style={thStyle}>Ученик</th>
                                    <th style={thStyle}>Класс</th>
                                    {selectedView === 'test' && <th style={thStyle}>Дата</th>}
                                    <th style={thStyle}>Результат</th>
                                    <th style={thStyle}>Баллы</th>
                                    <th style={thStyle}>Оценка</th>
                                </tr>
                                </thead>
                                <tbody>
                                {viewData.userStats.map((stat, index) => (
                                    <tr key={`${stat.userId}-${index}`} style={trStyle}>
                                        <td style={tdStyle}>{stat.userName}</td>
                                        <td style={tdStyle}>{stat.gradeName || 'Н/Д'}</td>
                                        {selectedView === 'test' && <td style={tdStyle}>{formatDate(stat.completedAt)}</td>}
                                        <td style={tdStyle}>
                                            <span style={{
                                                ...badgeStyle,
                                                backgroundColor: getPerformanceColor(stat.averagePercentage || 0)
                                            }}>
                                                {stat.averagePercentage ? stat.averagePercentage.toFixed(1) : '0.0'}%
                                            </span>
                                        </td>
                                        <td style={tdStyle}>{stat.score || 0} / {stat.maxScore || 0}</td>
                                        <td style={tdStyle}>
                                            <span style={{
                                                ...badgeStyle,
                                                backgroundColor: getPerformanceColor(stat.averagePercentage || 0)
                                            }}>
                                                {getPerformanceText(stat.averagePercentage || 0)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div style={noDataStyle}>
                            <p style={noDataTitleStyle}>Нет данных для отображения</p>
                            <p style={noDataSubtitleStyle}>
                                {selectedView === 'subject' && !selectedSubject && 'Выберите предмет для просмотра статистики'}
                                {selectedView === 'subject' && selectedSubject && 'Нет данных о выполненных тестах по этому предмету'}
                                {selectedView === 'grade' && !selectedGrade && 'Выберите класс для просмотра статистики'}
                                {selectedView === 'grade' && selectedGrade && 'Нет данных о выполненных тестах в этом классе'}
                                {selectedView === 'test' && !selectedTest && 'Выберите тест для просмотра статистики'}
                                {selectedView === 'test' && selectedTest && 'Нет данных о выполнении этого теста'}
                                {selectedView === 'school' && 'Нет данных о выполненных тестах в школе'}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {selectedView === 'subject' && selectedSubject && viewData && viewData.testStats && viewData.testStats.length > 0 && (
                <div style={sectionStyle}>
                    <h3 style={sectionTitleStyle}>Результаты тестов по предмету</h3>
                    <div style={tableContainerStyle}>
                        <table style={tableStyle}>
                            <thead>
                            <tr>
                                <th style={thStyle}>Тест</th>
                                <th style={thStyle}>Класс</th>
                                <th style={thStyle}>Средний балл</th>
                                <th style={thStyle}>Лучший результат</th>
                                <th style={thStyle}>Проходной балл</th>
                            </tr>
                            </thead>
                            <tbody>
                            {viewData.testStats.map((test, index) => (
                                <tr key={`test-${test.testId}-${index}`} style={trStyle}>
                                    <td style={tdStyle}>{test.testTitle}</td>
                                    <td style={tdStyle}>{test.gradeName || 'Все'}</td>
                                    <td style={tdStyle}>
                                        <span style={{
                                            ...badgeStyle,
                                            backgroundColor: getPerformanceColor(test.averagePercentage || 0)
                                        }}>
                                            {test.averagePercentage ? test.averagePercentage.toFixed(1) : '0.0'}%
                                        </span>
                                    </td>
                                    <td style={tdStyle}>{test.maxScore || 0} баллов</td>
                                    <td style={tdStyle}>{test.passingScore || 0} баллов</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

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

const viewSelectorStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    marginBottom: '1.5rem'
};

const viewButtonStyle = {
    padding: '0.75rem 1.25rem',
    borderRadius: '4px',
    border: 'none',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease'
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

const badgeStyle = {
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    color: 'white',
    fontSize: '0.75rem',
    fontWeight: 'bold'
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

export default TeacherAdminStatisticsPage;