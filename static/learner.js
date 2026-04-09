document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    
    if (!id) {
        document.getElementById("loading").style.display = "none";
        const err = document.getElementById("error-message");
        err.style.display = "block";
        err.textContent = "No module ID provided in URL.";
        return;
    }

    try {
        const response = await fetch(`/modules/${id}`);
        if (!response.ok) throw new Error("Module not found");
        const module = await response.json();

        document.getElementById("loading").style.display = "none";
        document.getElementById("module-content").style.display = "block";
        
        document.getElementById("view-title").textContent = module.title;
        document.getElementById("view-description").textContent = module.description;

        const blocksContainer = document.getElementById("view-blocks");

        module.blocks.forEach((block, idx) => {
            const el = document.createElement("div");
            el.className = "block-card";
            el.style.padding = "32px"; // extra padding for reading mode
            el.id = `block-${idx}`;

            if (block.type === "text") {
                el.innerHTML = `<div class="p-content">${escapeHTML(block.content)}</div>`;
            } else if (block.type === "image") {
                el.innerHTML = `
                    <figure>
                        <img src="${escapeHTML(block.url)}" alt="${escapeHTML(block.alt_text)}" class="img-fluid">
                        ${block.caption ? `<figcaption>${escapeHTML(block.caption)}</figcaption>` : ''}
                    </figure>
                `;
            } else if (block.type === "video") {
                el.innerHTML = `
                    <figure>
                        ${block.url.includes("youtube.com") || block.url.includes("youtu.be") 
                            ? `<iframe width="100%" height="400" src="${convertToEmbed(block.url)}" frameborder="0" allowfullscreen class="img-fluid"></iframe>`
                            : `<video width="100%" controls class="img-fluid"><source src="${escapeHTML(block.url)}"></video>`
                        }
                        ${block.caption ? `<figcaption>${escapeHTML(block.caption)}</figcaption>` : ''}
                    </figure>
                `;
            } else if (block.type === "quiz") {
                el.innerHTML = buildQuizHTML(block, el.id);
                // Attach logic after dom insertion
                setTimeout(() => attachQuizLogic(el, block), 0);
            }
            blocksContainer.appendChild(el);
        });

    } catch (err) {
        document.getElementById("loading").style.display = "none";
        const errMsg = document.getElementById("error-message");
        errMsg.style.display = "block";
        errMsg.textContent = err.message || "Failed to load module.";
    }
});

function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

function convertToEmbed(url) {
    let videoId = "";
    if (url.includes("youtube.com/watch")) {
        videoId = new URLSearchParams(url.split("?")[1]).get("v");
    } else if (url.includes("youtu.be/")) {
        videoId = url.split("youtu.be/")[1];
    }
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
}

function buildQuizHTML(block, blockId) {
    let choicesHtml = block.choices.map((c, i) => `
        <div class="choice-wrapper" data-index="${i}">
            <button class="learner-choice-btn" data-index="${i}">
                <span style="font-weight:600; margin-right:8px;">${String.fromCharCode(65 + i)}.</span> 
                ${escapeHTML(c.text)}
            </button>
            <div class="explanation-box" id="expl-${blockId}-${i}">
                ${escapeHTML(c.explanation)}
            </div>
        </div>
    `).join("");

    return `
        <div class="learner-quiz-header">Quiz: ${escapeHTML(block.question)}</div>
        <div class="quiz-choices-container">
            ${choicesHtml}
        </div>
        <div class="quiz-footer" style="display:flex; justify-content:space-between; align-items:center;">
            <button class="btn-submit btn-submit-quiz" id="submit-${blockId}" disabled>Submit Answer</button>
            <button class="btn-reveal-all" id="reveal-${blockId}" style="display:none;">Reveal Other Explanations</button>
        </div>
    `;
}

function attachQuizLogic(el, block) {
    const buttons = el.querySelectorAll('.learner-choice-btn');
    const submitBtn = el.querySelector('.btn-submit-quiz');
    const revealBtn = el.querySelector('.btn-reveal-all');
    let selectedIndex = -1;
    let isLocked = false; // Locks when correct answer is found

    buttons.forEach((btn, idx) => {
        btn.addEventListener('click', () => {
            if (isLocked) return;
            // Deselect all
            buttons.forEach(b => {
                b.classList.remove('selected');
                // clear incorrect states if they try again
                b.classList.remove('incorrect'); 
                const expBox = el.querySelector(`#expl-${el.id}-${b.dataset.index}`);
                expBox.style.display = 'none';
            });
            btn.classList.add('selected');
            selectedIndex = idx;
            submitBtn.disabled = false;
        });
    });

    submitBtn.addEventListener('click', () => {
        if (selectedIndex === -1 || isLocked) return;
        
        const selectedBtn = buttons[selectedIndex];
        const expBox = el.querySelector(`#expl-${el.id}-${selectedIndex}`);
        
        if (selectedIndex === block.correct_index) {
            // Correct logic
            selectedBtn.classList.remove('selected');
            selectedBtn.classList.add('correct');
            expBox.classList.add('correct');
            if (expBox.textContent.trim()) expBox.style.display = 'block';
            
            isLocked = true;
            submitBtn.style.display = 'none'; // hide submit
            revealBtn.style.display = 'inline-block'; // show reveal others
        } else {
            // Incorrect logic - only respective explanation shown
            selectedBtn.classList.remove('selected');
            selectedBtn.classList.add('incorrect');
            expBox.classList.add('incorrect');
            if (expBox.textContent.trim()) expBox.style.display = 'block';
            
            submitBtn.disabled = true; // wait for them to pick a new one
            // They can try again by selecting a different option (which triggers click listener again to reset)
        }
    });

    revealBtn.addEventListener('click', () => {
        buttons.forEach((b, idx) => {
            if (idx !== block.correct_index) {
                const expBox = el.querySelector(`#expl-${el.id}-${idx}`);
                if (expBox.textContent.trim() !== "") {
                    // Only display if they actually authored an explanation
                    expBox.style.display = 'block';
                }
            }
        });
        revealBtn.style.display = 'none'; // Hide after revealing
    });
}
