/**
 * about.js
 * Populates the about page from content.json site block.
 */

fetch("../content.json")
  .then((r) => r.json())
  .then((data) => {
    document.title = `About — ${data.site.name}`;
    document.getElementById("about-bio").textContent = data.site.bio;

    const contactList = document.getElementById("about-contact");
    const contact = data.site.contact || {};

    Object.entries(contact).forEach(([key, value]) => {
      const li = document.createElement("li");
      if (key === "email") {
        li.innerHTML = `<a href="mailto:${value}">${value}</a>`;
      } else if (value.startsWith("http")) {
        li.innerHTML = `${key}: <a href="${value}" target="_blank" rel="noopener">${value}</a>`;
      } else {
        li.textContent = `${key}: ${value}`;
      }
      contactList.appendChild(li);
    });
  });
