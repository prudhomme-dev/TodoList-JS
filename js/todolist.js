class task {
    constructor(title, priority, status = false) {
        this.title = title
        this.priority = priority
        this.status = status
    }
}

const saveStorage = (key, data) => {
    let jsonTask = JSON.stringify(data)
    localStorage.setItem(key, jsonTask)
}

const readStorage = (key) => {
    return JSON.parse(localStorage.getItem(key))
}

let tasks = []
if (JSON.parse(localStorage.getItem("Task"))) {
    tasks = readStorage("Task")
}

let priorityTask = document.querySelectorAll(".priorityTask")
let list = document.querySelector(".list")
let listArchives = document.querySelector(".listArchives")
let choiceUser = 1

const addTask = (e) => {
    if (e.key == "Enter" && e.target.value) {
        tasks.push(new task(document.querySelector("#newTask").value, parseInt(choiceUser)))
        saveStorage("Task", tasks)
        document.querySelector("#newTask").value = ""
        //console.log(JSON.parse(localStorage.getItem("Task")))
        displayTasks()
    }
}

const deleteTask = (e) => {
    tasks.splice(e.target.dataset.idTask, 1)
    saveStorage("Task", tasks)
    // Mettre en place le système de toast
    displayTasks()

}

const finishTask = (e) => {
    tasks[e.target.dataset.idTask].status = true
    saveStorage("Task", tasks)
    // Mettre en place le système de toast
    displayTasks()
}

const editTask = (e) => {
    let newInput = document.createElement("input")
    let task = document.querySelectorAll(".task")
    newInput.type="text"
    newInput.value=e.target.innerText
    newInput.addEventListener("keydown", editTaskValidation)
    for (let i=0; i<task.length; ++i)
    {
        if (task[i].dataset.idTask == e.target.dataset.idTask) {
            task[i].insertBefore(newInput, task[i].querySelector(".titleTask"))

        }
    }
    e.target.style.display="none"
}

const editTaskValidation = (e) => {
    if (e.key=="Escape")
    {
        console.log(e)
        e.target.remove()
        console.log(e.key, e.target.value)
    }
    
}

const displayTasks = () => {
    list.innerHTML = ""
    listArchives.innerHTML = ""
    for (let i = 0; i < tasks.length; ++i) {
        let Newtask = document.createElement("div")
        let newH3 = document.createElement("h3")
        let newDivAction = document.createElement("div")
        let newAFinish = document.createElement("a")
        let newADelete = document.createElement("a")
        newDivAction.classList.add("actionTask")
        newDivAction.classList.add("flex")
        Newtask.classList.add("task")
        Newtask.dataset.idTask = i
        Newtask.classList.add("flex")
        newH3.classList.add("titleTask")
        newH3.innerHTML = tasks[i].title
        newH3.title = tasks[i].title
        newH3.dataset.idTask = i
        newH3.addEventListener("dblclick", editTask)
        if (tasks[i].status == 0) {

            if (tasks[i].priority == 0) Newtask.classList.add("lowPriority")
            else if (tasks[i].priority == 1) Newtask.classList.add("normalPriority")
            else if (tasks[i].priority == 2) Newtask.classList.add("importantPriority")

            list.appendChild(Newtask)
            newAFinish.addEventListener("click", finishTask)
            newAFinish.dataset.idTask = i
            newAFinish.classList.add("finishTask")
            newDivAction.appendChild(newAFinish)
        } else {
            Newtask.classList.add("archived")
            listArchives.appendChild(Newtask)
        }
        newADelete.dataset.idTask = i
        newADelete.addEventListener("click", deleteTask)
        newADelete.classList.add("deleteTask")
        newDivAction.appendChild(newADelete)
        Newtask.appendChild(newH3)
        Newtask.appendChild(newDivAction)

    }
    if (document.querySelectorAll(".listArchives .task").length) document.querySelector(".taskArchivedTitle").style.display="block"
    else document.querySelector(".taskArchivedTitle").style.display="none"
}

const clickPriority = (e) => {
    choiceUser = e.target.dataset.priority
    for (let i = 0; i < priorityTask.length; ++i) {
        if (choiceUser == i) priorityTask[i].classList.add("selectPriority")
        else priorityTask[i].classList.remove("selectPriority")

    }
}

// Activation du clique des priorités
for (let i = 0; i < priorityTask.length; ++i) {
    priorityTask[i].addEventListener("click", clickPriority)
}

document.querySelector("#newTask").addEventListener("keydown", addTask)
displayTasks()
