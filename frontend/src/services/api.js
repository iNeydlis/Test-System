import axios from 'axios';

// Создаем экземпляр axios с базовой конфигурацией
const api = axios.create({
    baseURL: '/api', // Базовый URL для всех запросов, совпадает с вашими эндпоинтами
    timeout: 10000, // Таймаут запроса в миллисекундах
    headers: {
        'Content-Type': 'application/json',
    },
});

// Перехватчик запросов для добавления токена авторизации
api.interceptors.request.use(
    (config) => {
        // Получаем пользователя из localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            if (user && user.token) {
                config.headers.Authorization = user.token; // Добавляем токен в заголовки
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Перехватчик ответов для обработки ошибок
api.interceptors.response.use(
    (response) => {
        return response.data; // Возвращаем только данные из ответа
    },
    (error) => {
        // Обработка ошибок
        if (error.response) {
            if (error.response.status === 401) {
                // Если токен недействителен, удаляем пользователя и перенаправляем
                localStorage.removeItem('user');
                window.location.href = '/login'; // Перенаправление на страницу логина
            }
            return Promise.reject(
                new Error(error.response.data.message || 'Ошибка сервера')
            );
        }
        return Promise.reject(new Error('Ошибка сети или сервера недоступен'));
    }
);

export default api;