const THEME_STORAGE_KEY = "Theme"

const getStoredTheme = () => {
    try {
        return localStorage.getItem(THEME_STORAGE_KEY)
    } catch (error) {
        return null
    }
}

const storeTheme = (theme) => {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch (error) { }
}

const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")

const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme
}

applyTheme(getStoredTheme() || (systemTheme.matches ? "dark" : "light"))

systemTheme.addEventListener("change", (event) => {
    if (!getStoredTheme()) applyTheme(event.matches ? "dark" : "light")
})

document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.querySelector("#themeToggle")
    if (!toggle) return

    const refreshLabel = () => {
        toggle.setAttribute(
            "aria-label",
            document.documentElement.dataset.theme === "dark" ? "Passer en thème clair" : "Passer en thème sombre"
        )
    }

    refreshLabel()

    toggle.addEventListener("click", () => {
        const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark"
        applyTheme(next)
        storeTheme(next)
        refreshLabel()
    })
})