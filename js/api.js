const API_AUTH_URL = "api/auth.php"
const API_PASSWORD_URL = "api/password.php"
const API_TASKS_URL = "api/tasks.php"
const EXPOSURE_PROBE_URL = "data/password.txt"
const PASSWORD_STORAGE_KEY = "TodoList:password"

class ApiError extends Error {
    constructor(code, message, status) {
        super(message)
        this.code = code
        this.status = status
    }
}

const readStoredPassword = () => {
    try {
        return sessionStorage.getItem(PASSWORD_STORAGE_KEY) || ""
    } catch (error) {
        return ""
    }
}

const writeStoredPassword = (value) => {
    try {
        if (value) sessionStorage.setItem(PASSWORD_STORAGE_KEY, value)
        else sessionStorage.removeItem(PASSWORD_STORAGE_KEY)
    } catch (error) { }
}

const parseResponse = async (response) => {
    let payload = null
    try {
        payload = await response.json()
    } catch (error) {
        payload = null
    }
    if (!response.ok) {
        const code = payload && payload.error ? payload.error : "unknown"
        const message = payload && payload.message ? payload.message : "Erreur du serveur"
        throw new ApiError(code, message, response.status)
    }
    return payload
}

const call = async (url, method, body, password) => {
    const headers = { "X-Password": password || "" }
    if (body !== undefined) headers["Content-Type"] = "application/json"

    let response
    try {
        response = await fetch(url, {
            method: method,
            headers: headers,
            cache: "no-store",
            body: body === undefined ? undefined : JSON.stringify(body)
        })
    } catch (error) {
        throw new ApiError("network", "Serveur injoignable. Verifiez votre connexion.", 0)
    }
    return parseResponse(response)
}

const isStorageExposed = async () => {
    try {
        const response = await fetch(EXPOSURE_PROBE_URL, { cache: "no-store" })
        if (!response.ok) return false
        const content = (await response.text()).trim()
        return content.length > 0 && content.startsWith("$")
    } catch (error) {
        return false
    }
}

const fetchAuthMode = () => call(API_AUTH_URL, "GET")

const createPassword = (next) => call(API_PASSWORD_URL, "POST", { next: next })

const changePassword = (current, next) => call(API_PASSWORD_URL, "POST", { current: current, next: next }, current)

const fetchTasks = () => call(API_TASKS_URL, "GET", undefined, readStoredPassword())

let saveChain = Promise.resolve()

const persistTasks = (tasks) => {
    const snapshot = JSON.stringify(tasks)
    const password = readStoredPassword()
    saveChain = saveChain
        .catch(() => undefined)
        .then(() => call(API_TASKS_URL, "POST", JSON.parse(snapshot), password))
    return saveChain
}

const forgetPassword = () => writeStoredPassword("")
const rememberPassword = (value) => writeStoredPassword(value)