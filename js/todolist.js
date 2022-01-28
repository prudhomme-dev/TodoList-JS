let priorityTask = document.querySelectorAll(".priorityTask")
let choiceUser = 1
const addTask = (e) => {
    if (e.key == "Enter" && e.target.value) {
        console.log(choiceUser)


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