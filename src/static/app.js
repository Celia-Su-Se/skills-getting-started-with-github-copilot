document.addEventListener("DOMContentLoaded", () => {
  const activitiesListEl = document.getElementById("activities-list");
  const template = document.getElementById("activity-card-template");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageEl = document.getElementById("message");

  const cardsByName = {};

  function showMessage(text, type = "info") {
    messageEl.className = ""; // reset
    messageEl.classList.add("message", type);
    messageEl.textContent = text;
    messageEl.classList.remove("hidden");
    setTimeout(() => messageEl.classList.add("hidden"), 4000);
  }

  function clearLoading() {
    const loading = activitiesListEl.querySelector(".info-message");
    if (loading) loading.remove();
  }

  function renderActivities(activities) {
    clearLoading();
    Object.keys(activities).forEach((name) => {
      const data = activities[name];
      const clone = template.content.firstElementChild.cloneNode(true);
      clone.setAttribute("data-activity", name);

      clone.querySelector(".activity-name").textContent = name;
      clone.querySelector(".activity-description").textContent = data.description;
      clone.querySelector(".activity-schedule").textContent = `Schedule: ${data.schedule}`;
      clone.querySelector(".activity-capacity").textContent = `Capacity: ${data.participants.length}/${data.max_participants}`;

      const ul = clone.querySelector(".participants-list");
      ul.innerHTML = ""; // ensure empty
      if (data.participants && data.participants.length) {
        data.participants.forEach((p) => {
          const li = document.createElement("li");
          const a = document.createElement("a");
          a.href = `mailto:${p}`;
          a.textContent = p;
          a.style.color = "inherit";
          a.style.textDecoration = "none";
          li.appendChild(a);
          ul.appendChild(li);
        });
      } else {
        const li = document.createElement("li");
        li.textContent = "No participants yet.";
        ul.appendChild(li);
      }

      activitiesListEl.appendChild(clone);
      cardsByName[name] = { participantsUl: ul, capacityEl: activitiesListEl.querySelector(`.activity-card[data-activity="${name}"] .activity-capacity`) };
      // Add option to select
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      activitySelect.appendChild(opt);
    });
  }

  async function loadActivities() {
    try {
      const res = await fetch("/activities");
      if (!res.ok) throw new Error("Failed to load activities");
      const data = await res.json();
      renderActivities(data);
    } catch (err) {
      clearLoading();
      showMessage("Could not load activities.", "error");
      console.error(err);
    }
  }

  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const activityName = activitySelect.value;
    if (!email || !activityName) {
      showMessage("Please provide email and choose an activity.", "error");
      return;
    }

    try {
      const url = `/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(email)}`;
      const res = await fetch(url, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        const detail = body.detail || body.message || "Signup failed";
        throw new Error(detail);
      }

      // Update UI: add to participants list and update capacity
      const card = cardsByName[activityName];
      if (card) {
        // Remove "No participants yet." placeholder if present
        const placeholder = Array.from(card.participantsUl.children).find(li => li.textContent === "No participants yet.");
        if (placeholder) placeholder.remove();

        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = `mailto:${email}`;
        a.textContent = email;
        a.style.color = "inherit";
        a.style.textDecoration = "none";
        li.appendChild(a);
        card.participantsUl.appendChild(li);

        // Update capacity text
        const capEl = document.querySelector(`.activity-card[data-activity="${activityName}"] .activity-capacity`);
        if (capEl) {
          // Try parse current numbers and increment participant count
          const match = capEl.textContent.match(/(\d+)\s*\/\s*(\d+)/);
          if (match) {
            const current = parseInt(match[1], 10) + 1;
            const max = parseInt(match[2], 10);
            capEl.textContent = `Capacity: ${current}/${max}`;
          }
        }
      }

      showMessage(body.message || "Signed up successfully.", "success");
      signupForm.reset();
    } catch (err) {
      showMessage(err.message || "Signup failed.", "error");
      console.error(err);
    }
  });

  loadActivities();
});
