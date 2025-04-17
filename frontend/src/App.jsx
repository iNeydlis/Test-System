import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AdminPanel from './pages/AdminPanel';
import TestsList from './pages/TestsList';
import TestForm from './pages/TestForm';
import TestTaking from './pages/TestTaking';
import TestResult from './pages/TestResult';
import TestResultsList from './pages/TestResultsList';
import Header from './components/Header';
import Loading from './components/Loading';
import TestResultDetails from "./pages/TestResultDetails.jsx";
import StatisticsPage from "./pages/StudentStatisticsPage.jsx";
import StudentStatisticsPage from "./pages/StudentStatisticsPage.jsx";
import StatisticsRouter from "@/pages/StatisticsRouter.jsx";
import TeacherAdminStatisticsPage from "@/pages/TeacherAdminStatisticsPage.jsx";
import ProfileSettings from "@/pages/ProfileSettings.jsx";
import ProfileView from "@/pages/ProfileView.jsx";

const App = () => {
    const { user, loading } = useContext(AuthContext);

    if (loading) {
        return <Loading />;
    }

    return (
        <Router>
            <div className="app">
                <Header />
                <div className="container">
                    <Routes>
                        {/* Страница входа: доступна только неавторизованным */}
                        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />

                        {/* Панель администратора: только для ADMIN */}
                        <Route
                            path="/admin"
                            element={
                                user && user.role === 'ADMIN' ? <AdminPanel /> : <Navigate to="/" />
                            }
                        />

                        {/* Список тестов: для всех авторизованных */}
                        <Route
                            path="/tests"
                            element={user ? <TestsList /> : <Navigate to="/login" />}
                        />

                        {/* Создание теста: только для учителей и админов */}
                        <Route
                            path="/tests/create"
                            element={
                                user && (user.role === 'TEACHER' || user.role === 'ADMIN') ?
                                    <TestForm /> : <Navigate to="/tests" />
                            }
                        />
                        {/* Редактирование теста: только для учителей и админов */}
                        <Route
                            path="/tests/:testId/edit"
                            element={
                                user && (user.role === 'TEACHER' || user.role === 'ADMIN') ?
                                    <TestForm /> : <Navigate to="/tests" />
                            }
                        />

                        {/* Прохождение теста: только для студентов */}
                        <Route
                            path="/tests/:testId/start"
                            element={
                                user && user.role === 'STUDENT' ?
                                    <TestTaking /> : <Navigate to="/tests" />
                            }
                        />

                        {/* Alternative path for taking tests */}
                        <Route
                            path="/tests/:testId/take"
                            element={
                                user && user.role === 'STUDENT' ?
                                    <TestTaking /> : <Navigate to="/tests" />
                            }
                        />
                        <Route
                            path="/tests/teacher-result/:resultId"
                            element={
                                user && (user.role === 'TEACHER' || user.role === 'ADMIN') ?
                                    <TestResultDetails /> : <Navigate to="/tests" />
                            }
                        />
                        {/* Результат теста: только для студентов */}
                        <Route
                            path="/tests/result/:resultId"
                            element={
                                user && user.role === 'STUDENT' ?
                                    <TestResult /> : <Navigate to="/tests" />
                            }
                        />


                        {/* Результаты теста: только для учителей и админов */}
                        <Route
                            path="/tests/:testId/results"
                            element={
                                user && (user.role === 'TEACHER' || user.role === 'ADMIN') ?
                                    <TestResultsList /> : <Navigate to="/tests" />
                            }
                        />
                        {/* Статистика: основной маршрут для выбора раздела статистики */}
                        <Route
                            path="/statistics"
                            element={
                                user ? <StatisticsRouter /> : <Navigate to="/login" />
                            }
                        />

                        {/* Статистика ученика: только для студентов */}
                        <Route
                            path="/student-statistics"
                            element={
                                user && user.role === 'STUDENT' ?
                                    <StudentStatisticsPage /> : <Navigate to="/statistics" />
                            }
                        />
                        {/* Статистика для учителей и администраторов */}
                        <Route
                            path="/teacher-admin-statistics"
                            element={
                                user && (user.role === 'TEACHER' || user.role === 'ADMIN') ?
                                    <TeacherAdminStatisticsPage /> : <Navigate to="/statistics" />
                            }
                        />
                        {/* Главная страница: для всех авторизованных */}
                        <Route
                            path="/"
                            element={user ? <Dashboard /> : <Navigate to="/login" />}
                        />
                        <Route
                            path="/profile"
                            element={user ? <ProfileView /> : <Navigate to="/profile" />}
                         />
                        <Route
                            path="/profile/settings"
                            element={user ? <ProfileSettings /> : <Navigate to="/profile/settings" />}
                         />
                    </Routes>
                </div>
            </div>
        </Router>
    );
};

export default App;