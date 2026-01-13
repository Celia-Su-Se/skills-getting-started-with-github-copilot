document.addEventListener("DOMContentLoaded", () => {
  const activitiesListEl = document.getElementById("activities-list");
  const template = document.getElementById("activity-card-template");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageEl = document.getElementById("message");

  const cardsByName = {};

  // Helper: create participant <li> with mailto link and delete button
  function createParticipantLi(email, activityName) {
    const li = document.createElement("li");
    li.className = "participant-row";

    const a = document.createElement("a");
    a.href = `mailto:${email}`;
    a.textContent = email;
    a.style.color = "inherit";
    a.style.textDecoration = "none";

    const del = document.createElement("button");
    del.type = "button";
    del.className = "delete-participant";
    del.title = "Unregister participant";
    del.textContent = "×";

    del.addEventListener("click", async (ev) => {
      ev.stopPropagation();
      try {
        const url = `/activities/${encodeURIComponent(activityName)}/participants?email=${encodeURIComponent(email)}`;
        const res = await fetch(url, { method: "DELETE" });
        const body = await res.json();
        if (!res.ok) throw new Error(body.detail || body.message || "Delete failed");

        // remove li from DOM
        const parentUl = li.parentElement;
        li.remove();

        // if no participants left, add placeholder
        if (parentUl && parentUl.children.length === 0) {
          const placeholder = document.createElement("li");
          placeholder.textContent = "No participants yet.";
          parentUl.appendChild(placeholder);
        }

        // update capacity
        const capEl = document.querySelector(`.activity-card[data-activity="${activityName}"] .activity-capacity`);
        if (capEl) {
          const match = capEl.textContent.match(/(\d+)\s*\/\s*(\d+)/);
          if (match) {
            const current = Math.max(0, parseInt(match[1], 10) - 1);
            const max = parseInt(match[2], 10);
            capEl.textContent = `Capacity: ${current}/${max}`;
          }
        }

        showMessage(body.message || "Unregistered successfully.", "success");
      } catch (err) {
        showMessage(err.message || "Could not unregister.", "error");
        console.error(err);
      }
    });

    li.appendChild(a);
    li.appendChild(del);
    return li;
  }

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
          ul.appendChild(createParticipantLi(p, name));
        });
      } else {
        const li = document.createElement("li");
        li.textContent = "No participants yet.";
        ul.appendChild(li);
      }

      activitiesListEl.appendChild(clone);
      // store max participants on the card element for reliable client-side updates
      const cardEl = activitiesListEl.querySelector(`.activity-card[data-activity="${name}"]`);
      if (cardEl) cardEl.dataset.max = data.max_participants;
      cardsByName[name] = { participantsUl: ul, cardEl };
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

        // add new participant with delete button
        card.participantsUl.appendChild(createParticipantLi(email, activityName));

        // Update capacity text by counting participant items (ignore placeholder)
        const capEl = document.querySelector(`.activity-card[data-activity="${activityName}"] .activity-capacity`);
        if (capEl && card.cardEl) {
          const items = Array.from(card.participantsUl.children).filter(li => li.textContent !== "No participants yet.");
          const current = items.length;
          const max = parseInt(card.cardEl.dataset.max, 10) || 0;
          capEl.textContent = `Capacity: ${current}/${max}`;
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
