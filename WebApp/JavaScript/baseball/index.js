const form = document.getElementById("form");
const incomeForm = document.getElementById("income-form");
const inventoryList = document.getElementById("inventory-list");
const incomeList = document.getElementById("income-list");
const emptyMessage = document.getElementById("empty-message");
const emptyIncomeMessage = document.getElementById("empty-income-message");
const inventoryOwnerFilter = document.getElementById("inventory-owner-filter");
const inventoryCategoryFilter = document.getElementById("inventory-category-filter");
const dateInput = document.getElementById("date");
const incomeDateInput = document.getElementById("income-date");
const deleteConfirmation = document.getElementById("delete-confirmation");
const deleteConfirmationMessage = document.getElementById("delete-confirmation-message");
const confirmDeleteButton = document.getElementById("confirm-delete-button");
let pendingDelete = null;

let inventory = [];
let incomeRecords = [];

if (!dateInput.value) {
    dateInput.value = getToday();
}
incomeDateInput.value = getToday();

loadInventory();
loadIncome();


form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const formData = new FormData(form);

    const data = {
        date: formData.get("date"),
        name: formData.get("name").trim(),
        category: formData.get("category"),
        amount: Number(formData.get("amount")),
        quantity: Number(formData.get("quantity")),
        owner: formData.get("owner").trim()
    };

    try {
        const response = await fetch(
            "http://localhost:3000/api/inventory",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(data)
            }
        );

        if (!response.ok) {
            throw new Error("備品の登録に失敗しました");
        }

        const savedItem = await response.json();

        inventory.push(savedItem);

        renderInventory();

        form.reset();
        dateInput.value = getToday();

    } catch (error) {
        console.error(error);
        alert(error.message);
    }
});


// 変更箇所: 収入の登録先をlocalStorageからAPI/DBへ変更します。
incomeForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    incomeForm.classList.add("was-validated");
    if (!incomeForm.checkValidity()) {
        return;
    }

    const formData = new FormData(incomeForm);
    const data = {
        date: formData.get("date"),
        name: formData.get("name").trim(),
        amount: Number(formData.get("amount")),
        people: Number(formData.get("people"))
    };

    try {
        const response = await fetch("http://localhost:3000/api/income", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error("収入の登録に失敗しました");
        }

        const savedRecord = await response.json();
        incomeRecords.push(savedRecord);
        renderIncome();
        incomeForm.reset();
        incomeForm.classList.remove("was-validated");
        incomeDateInput.value = getToday();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
});

form.addEventListener("focusin", function () {
    incomeForm.classList.remove("was-validated");
});
incomeForm.addEventListener("focusin", function () {
    form.classList.remove("was-validated");
});

inventoryOwnerFilter.addEventListener("change", renderInventory);
inventoryCategoryFilter.addEventListener("change", renderInventory);

document.querySelectorAll("[data-delete-cancel]").forEach(function (button) {
    button.addEventListener("click", function () {
        deleteConfirmation.close();
    });
});
deleteConfirmation.addEventListener("close", function () {
    pendingDelete = null;
});
// 変更箇所: 確認ダイアログの削除操作を登録された処理に接続します。
confirmDeleteButton.addEventListener("click", async function () {
    const deleteAction = pendingDelete;
    deleteConfirmation.close();
    if (deleteAction) {
        await deleteAction();
    }
});

["name", "owner"].forEach(function (fieldName) {
    const input = document.getElementById(fieldName);
    input.addEventListener("input", function () {
        if (form.classList.contains("was-validated")) {
            setTrimmedFieldValidity(input);
        }
    });
});

function setTrimmedFieldValidity(input) {
    input.setCustomValidity(input.value.trim() ? "" : "入力してください。");
}

function confirmDelete(message, deleteAction) {
    deleteConfirmationMessage.textContent = message;
    pendingDelete = deleteAction;
    deleteConfirmation.showModal();
}

function getToday() {
    const today = new Date();
    return [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");
}

async function loadInventory() {
    try {
        const response = await fetch(
            "http://localhost:3000/api/inventory"
        );

        if (!response.ok) {
            throw new Error("備品データを取得できませんでした");
        }

        inventory = await response.json();

        renderInventory();

    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

// 変更箇所: 収入一覧をAPI/DBから取得し、画面と合計を更新します。
async function loadIncome() {
    try {
        const response = await fetch("http://localhost:3000/api/income");
        if (!response.ok) {
            throw new Error("収入データを取得できませんでした");
        }

        incomeRecords = await response.json();
        renderIncome();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

function formatCurrency(amount) {
    return `${new Intl.NumberFormat("ja-JP").format(amount)}円`;
}

// 変更箇所: 登録直後のISO形式と取得時のYYYY-MM-DD形式を統一します。
function formatDate(date) {
    const dateText = String(date);
    const matchedDate = dateText.match(/^\d{4}-\d{2}-\d{2}/);
    return matchedDate ? matchedDate[0] : dateText;
}

function renderIncome() {
    incomeList.replaceChildren();

    incomeRecords.forEach(function (record) {
        const row = document.createElement("tr");
        const people = Number(record.people);
        [
            formatDate(record.date),
            record.name || "未設定",
            formatCurrency(record.amount),
            people,
            formatCurrency(Number(record.amount) * people)
        ].forEach(function (value) {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        const actionCell = document.createElement("td");
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "btn btn-outline-danger btn-sm";
        deleteButton.textContent = "削除";
        deleteButton.setAttribute("aria-label", `${formatDate(record.date)}の収入を削除`);
        deleteButton.addEventListener("click", function () {
            confirmDelete(`${formatDate(record.date)}の収入を削除しますか？`, async function () {
                try {
                    const response = await fetch(
                        `http://localhost:3000/api/income/${record.id}`,
                        { method: "DELETE" }
                    );
                    if (!response.ok) {
                        throw new Error("収入の削除に失敗しました");
                    }

                    incomeRecords = incomeRecords.filter(function (savedRecord) {
                        return savedRecord.id !== record.id;
                    });
                    renderIncome();
                } catch (error) {
                    console.error(error);
                    alert(error.message);
                }
            });
        });
        actionCell.appendChild(deleteButton);
        row.appendChild(actionCell);
        incomeList.appendChild(row);
    });

    emptyIncomeMessage.hidden = incomeRecords.length > 0;
    renderTotals();
}

function renderTotals() {
    const totalIncome = incomeRecords.reduce(function (total, record) {
        return total + Number(record.amount) * Number(record.people);
    }, 0);
    const totalExpense = inventory.reduce(function (total, item) {
        return total + Number(item.amount) * Number(item.quantity);
    }, 0);

    document.getElementById("total-income").textContent = formatCurrency(totalIncome);
    document.getElementById("total-expense").textContent = formatCurrency(totalExpense);
    document.getElementById("balance").textContent = formatCurrency(totalIncome - totalExpense);
}

function renderInventory() {
    inventoryList.replaceChildren();

    updateInventoryFilterOptions(
        inventoryOwnerFilter,
        inventory.map(function (item) {
            return String(item.owner || "未設定");
        })
    );
    updateInventoryFilterOptions(
        inventoryCategoryFilter,
        inventory.map(function (item) {
            return String(item.category || "未設定");
        })
    );

    const filteredInventory = inventory.filter(function (item) {
        const owner = String(item.owner || "未設定");
        const category = String(item.category || "未設定");
        return (!inventoryOwnerFilter.value || owner === inventoryOwnerFilter.value)
            && (!inventoryCategoryFilter.value || category === inventoryCategoryFilter.value);
    });

    filteredInventory.forEach(function (item) {
        const row = document.createElement("tr");
        const values = [
            formatDate(item.date),
            item.name,
            item.category || "未設定",
            formatCurrency(item.amount),
            item.quantity,
            formatCurrency(Number(item.amount) * Number(item.quantity)),
            item.owner
        ];

        values.forEach(function (value) {
            const cell = document.createElement("td");
            cell.textContent = value;
            row.appendChild(cell);
        });

        const actionCell = document.createElement("td");
        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "btn btn-outline-danger btn-sm";
        deleteButton.textContent = "削除";
        deleteButton.setAttribute("aria-label", `${item.name}を削除`);
        deleteButton.addEventListener("click", function () {
            confirmDelete(`「${item.name}」を削除しますか？`, async function () {
                try {
                    const response = await fetch(
                        `http://localhost:3000/api/inventory/${item.id}`,
                        { method: "DELETE" }
                    );
                    if (!response.ok) {
                        throw new Error("備品の削除に失敗しました");
                    }

                    inventory = inventory.filter(function (savedItem) {
                        return savedItem.id !== item.id;
                    });
                    renderInventory();
                } catch (error) {
                    console.error(error);
                    alert(error.message);
                }
            });
        });
        actionCell.appendChild(deleteButton);
        row.appendChild(actionCell);
        inventoryList.appendChild(row);
    });

    emptyMessage.textContent = inventory.length === 0
        ? "登録された備品はありません。"
        : "条件に一致する備品はありません。";
    emptyMessage.hidden = filteredInventory.length > 0;
    renderTotals();
}

function updateInventoryFilterOptions(select, values) {
    const selectedValue = select.value;
    const options = Array.from(new Set(values)).sort(function (first, second) {
        return first.localeCompare(second, "ja");
    });

    select.replaceChildren();
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "すべて";
    select.appendChild(allOption);

    options.forEach(function (value) {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
    });

    select.value = options.includes(selectedValue) ? selectedValue : "";
}
