
const invalidEmail = 'invalid-user@example.com';
const invalidPassword = 'WrongPassword123!';

export const authenticationTestData = {
    invalidPassword: {
        password: invalidPassword,
    },

    invalidEmail: {
        email: invalidEmail,
    },

    invalidCredentials: {
        email: invalidEmail,
        password: invalidPassword,
    },
    
    emptyEmail: {
        email: '',
    },

    emptyPassword: {
        password: '',
    },

    emptyCredentials: {
        email: '',
        password: '',
    },
};
