const app = document.querySelector("#app")
const footer = document.querySelector("footer")
const screenLoading = document.querySelector("#screenLoading")
const screenUnlock = document.querySelector("#screenUnlock")
const screenSetup = document.querySelector("#screenSetup")
const screenBlocked = document.querySelector("#screenBlocked")

const banner = document.querySelector("#statusBanner")
const bannerText = document.querySelector("#statusBannerText")
const setupForm = document.querySelector("#setupForm")
const setupPassword = document.querySelector("#setupPassword")
const setupConfirm = document.querySelector("#setupConfirm")
const setupError = document.querySelector("#setupError")
const unlockForm = document.querySelector("#unlockForm")
const unlockPassword = document.querySelector("#unlockPassword")
const unlockError = document.querySelector("#unlockError")
const importBanner = document.querySelector("#importBanner")
const importAccept = document.querySelector("#importAccept")
const importDecline = document.querySelector("#importDecline")
const importCount = document.querySelector("#importCount")
const settingsToggle = document.querySelector("#settingsToggle")
const passwordDialog = document.querySelector("#passwordDialog")
const passwordForm = document.querySelector("#passwordForm")
const currentPassword = document.querySelector("#currentPassword")
const newPassword = document.querySelector("#newPassword")
const newPasswordConfirm = document.querySelector("#newPasswordConfirm")
const dialogError = document.querySelector("#dialogError")
const dialogCancel = document.querySelector("#dialogCancel")

const MIN_PASSWORD_LENGTH = 8
const LEGACY_STORAGE_KEYS = ["Task"]
const screens = [screenLoading, screenUnlock, screenSetup, screenBlocked]

const showScreen = (target) => {
    for (const screen of screens) screen.hidden = screen !== target
    app.hidden = target !== null
    footer.hidden = target !== null
}

const showBanner = (text, tone) => {
    bannerText.textContent = text
    banner.dataset.tone = tone
    banner.hidden = false
}

const hideBanner = () => { banner.hidden = true }

const showFieldError = (element, text) => {
    element.textContent = text
    element.hidden = !text
}

const readLegacyTasks = () => {
    for (const key of LEGACY_STORAGE_KEYS) {
        let raw = null
        try {
            raw = localStorage.getItem(key)
        } catch (error) {
            return []
        }
        if (!raw) continue
        try {
            const parsed = JSON.parse(raw)
            if (Array.isArray(parsed)) return parsed
        } catch (error) { }
    }
    return []
}

const clearLegacyTasks = () => {
    for (const key of LEGACY_STORAGE_KEYS) {
        try {
            localStorage.removeItem(key)
        } catch (error) { }
    }
}

const loadTasks = async () => {
    showScreen(screenLoading)
    try {
        const payload = await fetchTasks()
        tasks = Array.isArray(payload.tasks) ? payload.tasks : []
        displayTasks()
        showScreen(null)
        hideBanner()
        offerImport()
    } catch (error) {
        forgetPassword()
        if (error.status === 401 || error.status === 503) {
            showScreen(screenUnlock)
            showFieldError(unlockError, error.status === 503 ? error.message : "")
            return
        }
        showScreen(null)
        showBanner(error.message, "danger")
    }
}

const save = () => {
    persistTasks(tasks).catch((error) => {
        if (error.status === 401) {
            forgetPassword()
            showScreen(screenUnlock)
            showFieldError(unlockError, "Session expirée, déverrouillez à nouveau.")
            return
        }
        showBanner("Enregistrement impossible : " + error.message, "danger")
    })
}

const offerImport = () => {
    if (tasks.length > 0) return
    const legacy = readLegacyTasks()
    if (legacy.length === 0) return

    importCount.textContent = String(legacy.length)
    importBanner.hidden = false
}

importAccept.addEventListener("click", async () => {
    importBanner.hidden = true
    const legacy = readLegacyTasks()
    tasks = legacy.filter((item) => item && typeof item.title === "string" && item.title.trim() !== "")
    displayTasks()
    try {
        await persistTasks(tasks)
        clearLegacyTasks()
    } catch (error) {
        showBanner("Transfert vers le serveur impossible : " + error.message, "danger")
    }
})

importDecline.addEventListener("click", () => { importBanner.hidden = true })

setupForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    showFieldError(setupError, "")

    if (setupPassword.value.length < MIN_PASSWORD_LENGTH) {
        showFieldError(setupError, "Le mot de passe doit contenir au moins " + MIN_PASSWORD_LENGTH + " caractères.")
        return
    }
    if (setupPassword.value !== setupConfirm.value) {
        showFieldError(setupError, "Les deux mots de passe ne correspondent pas.")
        return
    }

    try {
        await createPassword(setupPassword.value)
        rememberPassword(setupPassword.value)
        setupForm.reset()
        await loadTasks()
    } catch (error) {
        showFieldError(setupError, error.message)
    }
})

unlockForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    showFieldError(unlockError, "")

    try {
        rememberPassword(unlockPassword.value)
        await fetchTasks()
        unlockForm.reset()
        await loadTasks()
    } catch (error) {
        forgetPassword()
        if (error.status === 401) {
            showFieldError(unlockError, "Mot de passe incorrect.")
        } else if (error.status === 423) {
            showFieldError(unlockError, error.message)
        } else {
            showFieldError(unlockError, error.message)
        }
    }
})

settingsToggle.addEventListener("click", () => {
    showFieldError(dialogError, "")
    passwordForm.reset()
    passwordDialog.showModal()
})

dialogCancel.addEventListener("click", () => passwordDialog.close())

passwordDialog.addEventListener("click", (e) => {
    if (e.target === passwordDialog) passwordDialog.close()
})

passwordForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    showFieldError(dialogError, "")

    if (newPassword.value.length < MIN_PASSWORD_LENGTH) {
        showFieldError(dialogError, "Le nouveau mot de passe doit contenir au moins " + MIN_PASSWORD_LENGTH + " caractères.")
        return
    }
    if (newPassword.value !== newPasswordConfirm.value) {
        showFieldError(dialogError, "Les deux mots de passe ne correspondent pas.")
        return
    }

    try {
        await changePassword(currentPassword.value, newPassword.value)
        rememberPassword(newPassword.value)
        passwordDialog.close()
        passwordForm.reset()
        showBanner("Mot de passe modifié.", "success")
    } catch (error) {
        if (error.status === 401) {
            showFieldError(dialogError, "Mot de passe actuel incorrect.")
            return
        }
        showFieldError(dialogError, error.message)
    }
})

const start = async () => {
    showScreen(screenLoading)
    hideBanner()

    if (await isStorageExposed()) {
        showScreen(screenBlocked)
        return
    }

    try {
        const mode = await fetchAuthMode()
        if (mode.mode === "bootstrap") {
            showScreen(screenSetup)
            return
        }
    } catch (error) {
        showScreen(null)
        showBanner(error.message, "danger")
        return
    }

    if (!readStoredPassword()) {
        showScreen(screenUnlock)
        return
    }

    await loadTasks()
}

start()