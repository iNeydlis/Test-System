import api from './api';

class TestService {
    // Test management methods
    getAllTests() {
        return api.get(`/tests`);
    }

    getTestById(testId, includeAnswers = false) {
        return api.get(`/tests/${testId}?includeAnswers=${includeAnswers}`);
    }

    getTestQuestions(testId, testResultId) {
        return api.get(`/tests/${testId}/questions?testResultId=${testResultId}`);
    }

    createTest(testData) {
        return api.post(`/tests`, testData);
    }

    updateTest(testId, testData) {
        return api.put(`/tests/${testId}`, testData);
    }

    deleteTest(testId) {
        return api.delete(`/tests/${testId}`);
    }

    // Subject-related methods
    getAllSubjects() {
        return api.get(`/subjects`);
    }

    // Grade-related methods
    getAllGrades() {
        return api.get(`/grades`);
    }

    // Test results methods
    getTestResults(testId) {
        return api.get(`/tests/${testId}/results`);
    }

    // Get all test results for the current student
    getStudentResults() {
        return api.get(`/tests/results`);
    }

    // Get a specific test result by ID
    getResultById(resultId) {
        return api.get(`/tests/results/${resultId}`);
    }

    // Check if test is in progress and get the test result id
    getInProgressTest(testId) {
        return api.get(`/tests/${testId}/in-progress`);
    }

    startTest(testId) {
        // Instead of a simple boolean lock, use a request tracking mechanism
        // Store the ongoing request promise so we can return it if called again
        if (this.pendingStartRequest) {
            return this.pendingStartRequest;
        }

        // Create a new request promise
        this.pendingStartRequest = this.getInProgressTest(testId)
            .then(response => {
                // If there's an existing in-progress test, return it
                if (response && response.id) {
                    return response;
                }
                // Otherwise start a new test
                return api.post(`/tests/${testId}/start`);
            })
            .catch(error => {
                console.error("Error in startTest:", error);
                // If the endpoint doesn't exist or returns an error, fallback to original method
                return api.post(`/tests/${testId}/start`);
            })
            .finally(() => {
                // Clear the pending request once completed
                this.pendingStartRequest = null;
            });

        return this.pendingStartRequest;
    }
    getTestResultDetails(resultId) {
        return api.get(`/tests/result/${resultId}`);
    }
    submitTest(submissionData) {
        return api.post(`/tests/submit`, submissionData);
    }
    reactivateTest(id, clearAttempts = false) {
        return api.post(`/tests/${id}/reactivate?clearAttempts=${clearAttempts}`);
    }
    permanentlyDeleteTest(testId) {
        return api.delete(`/tests/${testId}/permanent`);
    }

    getTeacherSubjectsAndGrades() {
        return api.get('/teacher/subjects-and-grades');
    }
    createTestWithFile(formData) {
        return api.post('/tests', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
    }
    updateTestWithFile(testId, formData, removeReferenceMaterials = false) {
        return api.put(`/tests/${testId}?removeReferenceMaterials=${removeReferenceMaterials}`,
            formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }
        );
    }
    downloadReferenceMaterials(testId, filename) {
        return api.get(`/tests/${testId}/reference-materials`, {
            responseType: 'blob'
        }).then(response => {
            // Create a blob URL and trigger download
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename || 'reference-materials');
            document.body.appendChild(link);
            link.click();
            link.remove();

            return true;
        }).catch(error => {
            console.error('Error downloading reference materials:', error);
            throw error;
        });
    }
    viewReferenceMaterials(testId) {
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.7)';
        modal.style.zIndex = '1000';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';

        const closeButton = document.createElement('button');
        closeButton.innerText = 'Закрыть';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '20px';
        closeButton.style.right = '20px';
        closeButton.style.padding = '10px';
        closeButton.style.cursor = 'pointer';
        closeButton.onclick = () => document.body.removeChild(modal);

        const iframe = document.createElement('iframe');
        iframe.style.width = '80%';
        iframe.style.height = '80%';
        iframe.style.border = 'none';

        api.get(`/tests/${testId}/reference-materials`, {
            responseType: 'blob',
            headers: {
                'Accept': 'application/pdf'
            }
        }).then(blob => {
            // Логируем для диагностики
            console.log('Received blob:', blob);
            console.log('Blob type:', blob.type);
            console.log('Blob size:', blob.size);

            // Проверяем, является ли blob объектом Blob
            if (!(blob instanceof Blob)) {
                throw new Error(`Получен не Blob, тип: ${typeof blob}`);
            }

            // Проверяем размер
            if (blob.size === 0) {
                throw new Error('Получен пустой файл');
            }

            // Проверяем первые байты
            blob.arrayBuffer().then(buffer => {
                const firstBytes = new Uint8Array(buffer.slice(0, 5));
                console.log('First 5 bytes:', String.fromCharCode(...firstBytes));
            }).catch(err => {
                console.error('Ошибка чтения первых байт:', err);
            });

            // Проверяем тип
            if (!blob.type.includes('application/pdf')) {
                throw new Error(`Некорректный тип данных: ${blob.type}`);
            }

            const url = URL.createObjectURL(blob);
            iframe.src = url;
        }).catch(error => {
            console.error('Ошибка загрузки PDF:', error);
            if (error.response) {
                console.error('Error response:', error.response.status, error.response.data);
            } else if (error.request) {
                console.error('No response received:', error.request);
                console.error('Possible CORS issue: Check Access-Control-Allow-Origin header');
            } else {
                console.error('Error setting up request:', error.message);
            }
            iframe.srcdoc = `<h1>Ошибка загрузки документа</h1><p>${error.message || 'Не удалось загрузить PDF'}</p>`;
        });

        modal.appendChild(closeButton);
        modal.appendChild(iframe);
        document.body.appendChild(modal);

        return Promise.resolve(true);
    }

}

export default new TestService();