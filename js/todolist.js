class task {
    constructor(title, priority, status = false) {
        this.title = title
        this.priority = priority
        this.status = status
    }
}

let tasks = []
let priorityTask = document.querySelectorAll(".priorityTask")
let list = document.querySelector(".list")
let listArchives = document.querySelector(".listArchives")
let choiceUser = 1

const addTask = (e) => {
    if (e.key == "Enter" && e.target.value) {
        tasks.push(new task(document.querySelector("#newTask").value, parseInt(choiceUser)))
        document.querySelector("#newTask").value = ""
        displayTasks()
        save()
    }
}

const deleteTask = (e) => {
    tasks.splice(Number(e.currentTarget.dataset.idTask), 1)
    displayTasks()
    save()
}

const finishTask = (e) => {
    tasks[Number(e.currentTarget.dataset.idTask)].status = true
    displayTasks()
    save()
}

const editTask = (e) => {
    const taskElement = e.target.closest(".task")
    const titleElement = taskElement.querySelector(".titleTask")

    const newInput = document.createElement("input")
    newInput.type = "text"
    newInput.value = tasks[Number(taskElement.dataset.idTask)].title
    newInput.setAttribute("aria-label", "Modifier la tâche")
    newInput.addEventListener("keydown", editTaskValidation)

    taskElement.insertBefore(newInput, titleElement)
    titleElement.style.display = "none"
    newInput.focus()
    newInput.select()
}

const editTaskValidation = (e) => {
    const input = e.target
    const taskElement = input.closest(".task")
    const titleElement = taskElement.querySelector(".titleTask")

    if (e.key === "Enter") {
        const value = input.value.trim()
        input.remove()
        if (value) {
            tasks[Number(taskElement.dataset.idTask)].title = value
            displayTasks()
            save()
        } else {
            displayTasks()
        }
    }

    if (e.key === "Escape") {
        input.remove()
        titleElement.style.display = ""
    }
}

const displayTasks = () => {
    list.innerHTML = ""
    listArchives.innerHTML = ""
    for (let i = 0; i < tasks.length; ++i) {
        let Newtask = document.createElement("div")
        let newH3 = document.createElement("h3")
        let newDivAction = document.createElement("div")
        let newAFinish = document.createElement("button")
        let newADelete = document.createElement("button")
        newDivAction.classList.add("actionTask")
        Newtask.classList.add("task")
        Newtask.dataset.idTask = i
        newH3.classList.add("titleTask")
        newH3.textContent = tasks[i].title
        newH3.title = tasks[i].title
        newH3.dataset.idTask = i
        newH3.addEventListener("dblclick", editTask)
        if (!tasks[i].status) {

            if (tasks[i].priority == 0) Newtask.classList.add("lowPriority")
            else if (tasks[i].priority == 1) Newtask.classList.add("normalPriority")
            else if (tasks[i].priority == 2) Newtask.classList.add("importantPriority")

            list.appendChild(Newtask)
            newAFinish.addEventListener("click", finishTask)
            newAFinish.dataset.idTask = i
            newAFinish.type = "button"
            newAFinish.classList.add("finishTask")
            newAFinish.setAttribute("aria-label", "Terminer la tâche")
            newDivAction.appendChild(newAFinish)
        } else {
            Newtask.classList.add("archived")
            listArchives.appendChild(Newtask)
        }
        newADelete.dataset.idTask = i
        newADelete.addEventListener("click", deleteTask)
        newADelete.type = "button"
        newADelete.classList.add("deleteTask")
        newADelete.setAttribute("aria-label", "Supprimer la tâche")
        newDivAction.appendChild(newADelete)
        Newtask.appendChild(newH3)
        Newtask.appendChild(newDivAction)

    }
    if (document.querySelectorAll(".listArchives .task").length) document.querySelector(".taskArchivedTitle").style.display = "block"
    else document.querySelector(".taskArchivedTitle").style.display = "none"
}

const clickPriority = (e) => {
    choiceUser = e.target.dataset.priority
    for (let i = 0; i < priorityTask.length; ++i) {
        if (choiceUser == i) priorityTask[i].classList.add("selectPriority")
        else priorityTask[i].classList.remove("selectPriority")

    }
}

for (let i = 0; i < priorityTask.length; ++i) {
    priorityTask[i].addEventListener("click", clickPriority)
}

document.querySelector("#newTask").addEventListener("keydown", addTask)