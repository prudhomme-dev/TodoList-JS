class task {
    constructor(title, priority, status=false){
        this.title=title
        this.priority=priority
        this.status=status
    }
}
let tasks = []
if (JSON.parse(localStorage.getItem("Task")))
{
    tasks = JSON.parse(localStorage.getItem("Task"))
}

console.log(tasks)

let priorityTask = document.querySelectorAll(".priorityTask")
let list = document.querySelector(".list")
let listArchives = document.querySelector(".listArchives")
let choiceUser = 1

const saveStorage = (key, data) =>
{
    let jsonTask=JSON.stringify(data)
    localStorage.setItem(key, jsonTask)
}

const addTask = (e) => {
    if (e.key == "Enter" && e.target.value) {
        tasks.push(new task(document.querySelector("#newTask").value, parseInt(choiceUser)))
        console.log(tasks)
        saveStorage("Task", tasks)
        document.querySelector("#newTask").value=""
        //console.log(JSON.parse(localStorage.getItem("Task")))
        displayTasks()
    }
    
}

const deleteTask = (e) =>
{
    console.log("Suppression ", e.target.dataset.idTask)
}

const finishTask = (e) =>{
    console.log("Marquer comme terminé ", e.target.dataset.idTask)
}

const displayTasks = () =>
{
    list.innerHTML=""
    for (let i=0; i<tasks.length; ++i)
    {
        if (tasks[i].status==0)
        {
            let Newtask = document.createElement("div")
            let newH3 = document.createElement("h3")
            let newDivAction = document.createElement("div")
            let newAFinish = document.createElement("a")
            let newADelete = document.createElement("a")
            newDivAction.classList.add("actionTask")
            newDivAction.classList.add("flex")
            Newtask.classList.add("task")
            Newtask.classList.add("flex")
            if (tasks[i].priority==0) Newtask.classList.add("lowPriority")
            else if (tasks[i].priority==1) Newtask.classList.add("normalPriority")
            else if (tasks[i].priority==2) Newtask.classList.add("importantPriority")
            newH3.classList.add("titleTask")
            newH3.innerHTML=tasks[i].title
            list.appendChild(Newtask)
            Newtask.appendChild(newH3)
            Newtask.appendChild(newDivAction)
            newAFinish.dataset.idTask=i
            newADelete.dataset.idTask=i
            newADelete.addEventListener("click", deleteTask)
            newAFinish.addEventListener("click", finishTask)
            newAFinish.classList.add("finishTask")
            newADelete.classList.add("deleteTask")
            newDivAction.appendChild(newAFinish)
            newDivAction.appendChild(newADelete)
        }

    }
}

const clickPriority = (e) => {
    choiceUser = e.target.dataset.priority
    for (let i = 0; i < priorityTask.length; ++i) {
        if (choiceUser==i) priorityTask[i].classList.add("selectPriority")
        else priorityTask[i].classList.remove("selectPriority")
        
    }
}

// Activation du clique des priorités
for (let i = 0; i < priorityTask.length; ++i) {
    priorityTask[i].addEventListener("click", clickPriority)
}

document.querySelector("#newTask").addEventListener("keydown", addTask)
displayTasks()