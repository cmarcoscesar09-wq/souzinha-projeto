
"use strict";

const $ = (id) => document.getElementById(id);

const TIME_OPTIONS = ["Até 2 h", "2–4 h", "4–6 h", "Mais de 6 h"];
const USE_OPTIONS = ["Estudos", "Redes sociais", "Jogos", "Vídeos e música"];
const BREAK_OPTIONS = ["Sempre", "Às vezes", "Raramente", "Nunca"];
const AGE_OPTIONS = ["Até 14 anos", "15 a 17 anos", "18 a 24 anos", "25 anos ou mais"];

const MIDPOINTS = {
  "Até 2 h": 1,
  "2–4 h": 3,
  "4–6 h": 5,
  "Mais de 6 h": 7
};

const STORAGE_KEY = "tempoDeTela2026";

function createDemoData() {
  const times = [
    ...Array(4).fill("Até 2 h"),
    ...Array(11).fill("2–4 h"),
    ...Array(11).fill("4–6 h"),
    ...Array(3).fill("Mais de 6 h")
  ];

  const pauses = [
    ...Array(11).fill("Sempre"),
    ...Array(11).fill("Às vezes"),
    ...Array(5).fill("Raramente"),
    ...Array(2).fill("Nunca")
  ];

  const uses = [
    ...Array(5).fill("Estudos"),
    ...Array(7).fill("Redes sociais"),
    ...Array(12).fill("Jogos"),
    ...Array(5).fill("Vídeos e música")
  ];

  return times.map((hours, index) => ({
    id: index + 1,
    age: AGE_OPTIONS[index % AGE_OPTIONS.length],
    hours: hours,
    purpose: uses[index],
    pause: pauses[index]
  }));
}

const DEMO_DATA = createDemoData();

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved !== null) {
      const parsed = JSON.parse(saved);

      if (Array.isArray(parsed) && parsed.every(isValidRecord)) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn("Não foi possível carregar os dados salvos.", error);
  }

  return DEMO_DATA.map(record => ({ ...record }));
}

function isValidRecord(record) {
  return record &&
    Number.isInteger(record.id) &&
    AGE_OPTIONS.includes(record.age) &&
    TIME_OPTIONS.includes(record.hours) &&
    USE_OPTIONS.includes(record.purpose) &&
    BREAK_OPTIONS.includes(record.pause);
}

let records = loadData();
let editingId = null;

function saveData() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch (error) {
    alert("Não foi possível salvar os dados neste navegador. Exporte um CSV para guardar uma cópia.");
    return false;
  }
}

function getFilteredData() {
  return records.filter(record => {
    const ageMatches =
      !$("ageFilter").value ||
      record.age === $("ageFilter").value;

    const useMatches =
      !$("useFilter").value ||
      record.purpose === $("useFilter").value;

    return ageMatches && useMatches;
  });
}

function countBy(data, property, options) {
  return options.map(label => ({
    label: label,
    value: data.filter(record => record[property] === label).length
  }));
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[character];
  });
}

function renderChart(elementId, data, colorClass = "") {
  const container = $(elementId);
  const maxValue = Math.max(1, ...data.map(item => item.value));

  container.innerHTML = data.map(item => {
    const height = item.value > 0
      ? Math.max(4, (item.value / maxValue) * 115)
      : 3;

    return `
      <div class="bar-group">
        <span class="bar-number">${item.value}</span>
        <div
          class="bar ${colorClass}"
          style="height: ${height}px"
          title="${escapeHTML(item.label)}: ${item.value} resposta(s)"
        ></div>
        <span class="bar-label">${escapeHTML(item.label)}</span>
      </div>
    `;
  }).join("");
}

function renderDashboard() {
  const data = getFilteredData();
  const total = data.length;

  const average = total > 0
    ? data.reduce((sum, record) => sum + MIDPOINTS[record.hours], 0) / total
    : 0;

  const overFourHours = total > 0
    ? Math.round(
        data.filter(record =>
          record.hours === "4–6 h" ||
          record.hours === "Mais de 6 h"
        ).length / total * 100
      )
    : 0;

  const takeBreaks = total > 0
    ? Math.round(
        data.filter(record =>
          record.pause === "Sempre" ||
          record.pause === "Às vezes"
        ).length / total * 100
      )
    : 0;

  $("total").textContent = total;
  $("average").textContent =
    average.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " h";
  $("over4").textContent = overFourHours + "%";
  $("breaks").textContent = takeBreaks + "%";

  renderChart("timeChart", countBy(data, "hours", TIME_OPTIONS));
  renderChart("useChart", countBy(data, "purpose", USE_OPTIONS), "purple");
  renderChart("breakChart", countBy(data, "pause", BREAK_OPTIONS), "gold");

  const timeCounts = countBy(data, "hours", TIME_OPTIONS);
  const useCounts = countBy(data, "purpose", USE_OPTIONS);

  const mostCommonTime = [...timeCounts].sort((a, b) => b.value - a.value)[0];
  const mostCommonUse = [...useCounts].sort((a, b) => b.value - a.value)[0];

  if (total === 0) {
    $("insight").textContent =
      "Nenhuma resposta encontrada. Altere os filtros ou cadastre novas respostas.";
  } else {
    $("insight").textContent =
      `Foram consideradas ${total} respostas. ` +
      `A média estimada é de ${average.toLocaleString("pt-BR", {
        maximumFractionDigits: 1
      })} horas por dia. ` +
      `${overFourHours}% relatam mais de quatro horas diárias. ` +
      `${takeBreaks}% dizem fazer pausas sempre ou às vezes. ` +
      `A faixa mais frequente é "${mostCommonTime.label}" e ` +
      `a finalidade mais indicada é "${mostCommonUse.label}".`;
  }

  renderTable();
}

function renderTable() {
  const query = $("search").value.trim().toLocaleLowerCase("pt-BR");

  const data = getFilteredData().filter(record => {
    const searchable = [
      record.id,
      record.age,
      record.hours,
      record.purpose,
      record.pause
    ].join(" ").toLocaleLowerCase("pt-BR");

    return searchable.includes(query);
  });

  if (data.length === 0) {
    $("tableWrap").innerHTML =
      '<div class="empty">Nenhuma resposta encontrada.</div>';
    return;
  }

  const rows = data.map(record => `
    <tr>
      <td>${record.id}</td>
      <td>${escapeHTML(record.age)}</td>
      <td>${escapeHTML(record.hours)}</td>
      <td>${escapeHTML(record.purpose)}</td>
      <td>${escapeHTML(record.pause)}</td>
      <td>
        <button type="button" data-edit="${record.id}">Editar</button>
        <button type="button" class="danger" data-delete="${record.id}">Excluir</button>
      </td>
    </tr>
  `).join("");

  $("tableWrap").innerHTML = `
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Faixa etária</th>
          <th>Tempo diário</th>
          <th>Uso principal</th>
          <th>Pausas</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function openModal(record = null) {
  editingId = record ? record.id : null;

  $("modalTitle").textContent = record
    ? "Editar resposta"
    : "Adicionar resposta";

  $("age").value = record ? record.age : "15 a 17 anos";
  $("hours").value = record ? record.hours : "4–6 h";
  $("purpose").value = record ? record.purpose : "Estudos";
  $("pause").value = record ? record.pause : "Sempre";

  $("modalBackdrop").classList.add("open");
}

function closeModal() {
  $("modalBackdrop").classList.remove("open");
  editingId = null;
}

function saveForm(event) {
  event.preventDefault();

  const recordData = {
    age: $("age").value,
    hours: $("hours").value,
    purpose: $("purpose").value,
    pause: $("pause").value
  };

  if (
    !AGE_OPTIONS.includes(recordData.age) ||
    !TIME_OPTIONS.includes(recordData.hours) ||
    !USE_OPTIONS.includes(recordData.purpose) ||
    !BREAK_OPTIONS.includes(recordData.pause)
  ) {
    alert("Confira os campos preenchidos.");
    return;
  }

  if (editingId !== null) {
    records = records.map(record =>
      record.id === editingId
        ? { id: record.id, ...recordData }
        : record
    );
  } else {
    const nextId = records.reduce(
      (max, record) => Math.max(max, record.id), 0
    ) + 1;

    records.push({ id: nextId, ...recordData });
  }

  saveData();
  closeModal();
  renderDashboard();
}

function handleTableClick(event) {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");

  if (editButton) {
    const id = Number(editButton.dataset.edit);
    const record = records.find(item => item.id === id);

    if (record) openModal(record);
    return;
  }

  if (deleteButton) {
    const id = Number(deleteButton.dataset.delete);

    if (confirm("Deseja excluir esta resposta?")) {
      records = records.filter(record => record.id !== id);
      saveData();
      renderDashboard();
    }
  }
}

function exportCSV() {
  const headers = [
    "id",
    "faixa_etaria",
    "tempo_diario",
    "uso_principal",
    "pausas"
  ];

  const rows = records.map(record => [
    record.id,
    record.age,
    record.hours,
    record.purpose,
    record.pause
  ]);

  const csv = [headers, ...rows]
    .map(row => row.map(value =>
      '"' + String(value).replace(/"/g, '""') + '"'
    ).join(";"))
    .join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "pesquisa_tempo_de_tela.csv";
  link.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function parseCSVLine(line, delimiter) {
  const result = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const character = line[i];

    if (character === '"' && line[i + 1] === '"' && quoted) {
      value += '"';
      i++;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === delimiter && !quoted) {
      result.push(value.trim());
      value = "";
    } else {
      value += character;
    }
  }

  result.push(value.trim());
  return result;
}

function normalizeHeader(value) {
  return value.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function findOption(value, options) {
  const normalized = value.trim().toLocaleLowerCase("pt-BR");

  return options.find(option =>
    option.toLocaleLowerCase("pt-BR") === normalized
  ) || null;
}

async function importCSV(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const content = (await file.text()).replace(/^\uFEFF/, "");
    const lines = content.split(/\r?\n/).filter(line => line.trim());

    if (lines.length < 2) {
      throw new Error("O arquivo não contém respostas.");
    }

    const semicolons = (lines[0].match(/;/g) || []).length;
    const commas = (lines[0].match(/,/g) || []).length;
    const delimiter = semicolons >= commas ? ";" : ",";

    const rows = lines.map(line => parseCSVLine(line, delimiter));
    const headers = rows.shift().map(normalizeHeader);

    const findColumn = (...names) =>
      headers.findIndex(header => names.includes(header));

    const ageIndex = findColumn("faixaetaria", "idade", "age");
    const hoursIndex = findColumn("tempodiario", "horasdetela", "horas", "hours");
    const purposeIndex = findColumn("usoprincipal", "finalidade", "uso", "purpose");
    const pauseIndex = findColumn("pausas", "fazpausas", "pause");

    if ([ageIndex, hoursIndex, purposeIndex, pauseIndex].some(index => index < 0)) {
      throw new Error(
        "O CSV precisa ter colunas para faixa etária, tempo diário, uso principal e pausas."
      );
    }

    const imported = [];

    for (const row of rows) {
      const age = findOption(row[ageIndex] || "", AGE_OPTIONS);

      const rawHours = (row[hoursIndex] || "")
        .replace(/[–—]/g, "-")
        .replace(/(\d)\s*-\s*(\d)/g, "$1–$2")
        .replace(/\s+/g, " ")
        .trim();

      const hours = findOption(rawHours, TIME_OPTIONS);
      const purpose = findOption(row[purposeIndex] || "", USE_OPTIONS);
      const pause = findOption(row[pauseIndex] || "", BREAK_OPTIONS);

      if (age && hours && purpose && pause) {
        imported.push({ age, hours, purpose, pause });
      }
    }

    if (!imported.length) {
      throw new Error(
        "Nenhuma resposta válida encontrada. Confira os valores no arquivo."
      );
    }

    let nextId = records.reduce(
      (max, record) => Math.max(max, record.id), 0
    ) + 1;

    records.push(...imported.map(record => ({
      id: nextId++,
      ...record
    })));

    saveData();
    renderDashboard();

    alert(`${imported.length} resposta(s) importada(s).`);
  } catch (error) {
    alert("Erro ao importar CSV: " + error.message);
  } finally {
    event.target.value = "";
  }
}

function initializeDashboard() {
  $("addBtn").addEventListener("click", () => openModal());
  $("cancelBtn").addEventListener("click", closeModal);

  $("responseForm").addEventListener("submit", saveForm);

  $("modalBackdrop").addEventListener("click", event => {
    if (event.target === $("modalBackdrop")) closeModal();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeModal();
  });

  $("tableWrap").addEventListener("click", handleTableClick);

  $("ageFilter").addEventListener("change", renderDashboard);
  $("useFilter").addEventListener("change", renderDashboard);
  $("search").addEventListener("input", renderTable);

  $("dataBtn").addEventListener("click", () => {
    $("dataSection").scrollIntoView({ behavior: "smooth" });
  });

  $("hideDataBtn").addEventListener("click", () => {
    const hidden = $("tableWrap").classList.toggle("hidden");

    $("hideDataBtn").textContent = hidden
      ? "Mostrar tabela"
      : "Ocultar tabela";
  });

  $("themeBtn").addEventListener("click", () => {
    document.body.classList.toggle("light");
  });

  $("resetBtn").addEventListener("click", () => {
    if (confirm("Restaurar as respostas demonstrativas? As alterações atuais serão perdidas.")) {
      records = DEMO_DATA.map(record => ({ ...record }));

      $("ageFilter").value = "";
      $("useFilter").value = "";
      $("search").value = "";

      saveData();
      renderDashboard();
    }
  });

  $("exportBtn").addEventListener("click", exportCSV);
  $("csvFile").addEventListener("change", importCSV);

  renderDashboard();
}

document.addEventListener("DOMContentLoaded", () => {
  initializeDashboard();
});

const moderatorPanel = $("moderatorPanel");

$("moderatorTabBtn").addEventListener("click", () => {
  const password = prompt("Digite a senha do moderador:");

  if (password !== "souza1245") {
    alert("Acesso negado.");
    return;
  }

  moderatorPanel.hidden = false;
});

$("closeModeratorPanel").addEventListener("click", () => {
  moderatorPanel.hidden = true;
});

$("moderatorNewResponse").addEventListener("click", () => {
  openModal();
});

$("moderatorExportCsv").addEventListener("click", exportCSV);

$("moderatorViewData").addEventListener("click", () => {
  $("dataSection").scrollIntoView({ behavior: "smooth" });
  $("tableWrap").classList.remove("hidden");
  $("hideDataBtn").textContent = "Ocultar tabela";
});

$("moderatorRestoreExamples").addEventListener("click", () => {
  if (confirm("Deseja substituir os dados atuais pelos exemplos?")) {
    records = DEMO_DATA.map(record => ({ ...record }));
    $("ageFilter").value = "";
    $("useFilter").value = "";
    $("search").value = "";
    saveData();
    renderDashboard();
    $("moderatorMessage").textContent = "Dados de exemplo restaurados.";
  }
});

$("moderatorCsvFile").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;

  await importCSV({ target: event.target });
});

async function verifyOwnerSession() {
  const { data, error } = await supabaseClient.auth.getUser();
  const user = data?.user;

  const isOwner =
    !error && user?.id === "SEU-UID-DO-PROPRIETARIO";

  document.body.classList.toggle("moderator-mode", isOwner);

  return isOwner;
}


const impactForm = document.getElementById("screenImpactForm");
const impactChart = document.getElementById("screenImpactChart");
const impactMessage = document.getElementById("screenImpactMessage");
const impactTotal = document.getElementById("screenImpactTotal");

const impactStorageKey = "maratonaTech_screenImpact_v1";

function getImpactAnswers() {
  try {
    const data = JSON.parse(localStorage.getItem(impactStorageKey) || "[]");
    return Array.isArray(data)
      ? data.filter(item => ["Sim", "Não", "Talvez"].includes(item))
      : [];
  } catch {
    return [];
  }
}

function renderImpactChart() {
  const answers = getImpactAnswers();
  const options = ["Sim", "Não", "Talvez"];

  impactChart.innerHTML = "";

  options.forEach(option => {
    const count = answers.filter(answer => answer === option).length;
    const percentage = answers.length
      ? Math.round((count / answers.length) * 100)
      : 0;

    const item = document.createElement("div");
    item.className = "impact-item";

    const label = document.createElement("div");
    label.className = "impact-label";
    label.textContent = `${option} — ${count} (${percentage}%)`;

    const track = document.createElement("div");
    track.className = "impact-track";

    const bar = document.createElement("div");
    bar.className = "impact-bar";
    bar.style.width = `${percentage}%`;
    bar.setAttribute("role", "progressbar");
    bar.setAttribute("aria-valuenow", String(percentage));
    bar.setAttribute("aria-valuemin", "0");
    bar.setAttribute("aria-valuemax", "100");
    bar.setAttribute("aria-label", `${option}: ${percentage}%`);

    track.appendChild(bar);
    item.append(label, track);
    impactChart.appendChild(item);
  });

  impactTotal.textContent =
    `Respostas registradas: ${answers.length}`;
}

impactForm?.addEventListener("submit", event => {
  event.preventDefault();

  const selected = impactForm.querySelector(
    'input[name="screenImpact"]:checked'
  );

  if (!selected) return;

  const answers = getImpactAnswers();
  answers.push(selected.value);

  localStorage.setItem(impactStorageKey, JSON.stringify(answers));

  impactMessage.textContent = "Resposta registrada com sucesso!";
  impactForm.reset();
  renderImpactChart();
});

renderImpactChart();
