import { SESSION_KEY } from "./vars.config";

const getSession   = ()  => { 
    try{ 
        return JSON.parse(localStorage.getItem(SESSION_KEY))||null; 
    }catch{
        return null;
    }
};
const setSession = (u) => localStorage.setItem(SESSION_KEY, JSON.stringify(u));
const clearSession = ()  => localStorage.removeItem(SESSION_KEY);

export {
    getSession,
    setSession,
    clearSession
}