document.addEventListener("DOMContentLoaded", () => {
    const blocksContainer = document.getElementById("blocks-container");
    const addButtons = document.querySelectorAll(".btn-add");
    const submitBtn = document.getElementById("submit-module");
    const statusMsg = document.getElementById("status-message");

    let blockCounter = 0;

    function createBlockHeader(title, blockId) {
        return `
            <div class="block-header">
                <span class="block-title">${title}</span>
                <button type="button" class="btn-remove" onclick="document.getElementById('${blockId}').remove()">Remove</button>
            </div>
        `;
    }

    function addTextBlock() {
        const id = `block-${blockCounter++}`;
        const div = document.createElement("div");
        div.className = "block-card";
        div.id = id;
        div.dataset.type = "text";
        div.innerHTML = `
            ${createBlockHeader("Text Block", id)}
            <div class="input-group">
                <label>Content (Markdown supported)</label>
                <textarea class="block-content" rows="3" placeholder="Enter text here..."></textarea>
            </div>
        `;
        blocksContainer.appendChild(div);
    }

    function addImageBlock() {
        const id = `block-${blockCounter++}`;
        const div = document.createElement("div");
        div.className = "block-card";
        div.id = id;
        div.dataset.type = "image";
        div.innerHTML = `
            ${createBlockHeader("Image Block", id)}
            <div class="input-group">
                <label>Upload Image</label>
                <input type="file" accept="image/*" onchange="uploadFile(this, '${id}')">
                <input type="hidden" class="block-url">
                <div class="upload-status" style="font-size:13px; font-weight:500; margin-top:6px;"></div>
            </div>
            <div class="input-group">
                <label>Alt Text</label>
                <input type="text" class="block-alt" placeholder="Describe the image">
            </div>
            <div class="input-group">
                <label>Caption (optional)</label>
                <input type="text" class="block-caption" placeholder="Caption below image">
            </div>
        `;
        blocksContainer.appendChild(div);
    }

    function addVideoBlock() {
        const id = `block-${blockCounter++}`;
        const div = document.createElement("div");
        div.className = "block-card";
        div.id = id;
        div.dataset.type = "video";
        div.innerHTML = `
            ${createBlockHeader("Video Block", id)}
            <div class="input-group">
                <label>Upload Video</label>
                <input type="file" accept="video/*" onchange="uploadFile(this, '${id}')">
                <input type="hidden" class="block-url">
                <div class="upload-status" style="font-size:13px; font-weight:500; margin-top:6px;"></div>
            </div>
            <div class="input-group">
                <label>Caption (optional)</label>
                <input type="text" class="block-caption" placeholder="Caption below video">
            </div>
        `;
        blocksContainer.appendChild(div);
    }

    function addQuizBlock() {
        const id = `block-${blockCounter++}`;
        const div = document.createElement("div");
        div.className = "block-card";
        div.id = id;
        div.dataset.type = "quiz";
        
        div.innerHTML = `
            ${createBlockHeader("Quiz Block", id)}
            <div class="input-group">
                <label>Question</label>
                <input type="text" class="block-question" placeholder="E.g. What is 2+2?">
            </div>
            <div class="choices-container">
                <label>Choices (Select the correct one)</label>
                <div class="choices-list" id="choices-${id}">
                    ${generateChoiceHTML(id, 0)}
                    ${generateChoiceHTML(id, 1)}
                </div>
                <button type="button" class="btn-add" style="align-self: flex-start; margin-top: 10px;" onclick="addChoice('${id}')">+ Add Option</button>
            </div>
        `;
        blocksContainer.appendChild(div);
    }

    function generateChoiceHTML(blockId, index) {
        return `
            <div class="choice-row">
                <div class="radio-container">
                    <input type="radio" name="correct-${blockId}" value="${index}" ${index === 0 ? "checked" : ""}>
                </div>
                <div style="flex:1;">
                    <input type="text" class="choice-text" placeholder="Option text" required style="margin-bottom:8px;">
                    <input type="text" class="choice-explanation" placeholder="Explanation (why is this right/wrong?)" style="font-size:13px;">
                </div>
            </div>
        `;
    }

    // Expose helpers globally for inline element execution
    window.addChoice = function(blockId) {
        const list = document.getElementById(`choices-${blockId}`);
        const currentCount = list.children.length;
        if (currentCount >= 6) {
            alert("Maximum 6 choices allowed.");
            return;
        }
        const temp = document.createElement('div');
        temp.innerHTML = generateChoiceHTML(blockId, currentCount);
        list.appendChild(temp.firstElementChild);
    };

    window.uploadFile = async function(inputElem, blockId) {
        const file = inputElem.files[0];
        if (!file) return;

        const blockEl = document.getElementById(blockId);
        const statusEl = blockEl.querySelector(".upload-status");
        const urlInput = blockEl.querySelector(".block-url");

        statusEl.textContent = "Uploading file safely to database...";
        statusEl.style.color = "#666";

        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch("/upload/", {
                method: "POST",
                body: formData
            });

            if (!response.ok) throw new Error("Upload failed. Server might be down.");

            const data = await response.json();
            urlInput.value = data.url;
            statusEl.textContent = "Upload complete! ✓";
            statusEl.style.color = "#10b981";
        } catch (err) {
            statusEl.textContent = "Error: " + err.message;
            statusEl.style.color = "#ef4444";
            urlInput.value = "";
        }
    };

    addButtons.forEach(btn => {
        btn.addEventListener("click", (e) => {
            const type = e.target.dataset.type;
            if (type === "text") addTextBlock();
            if (type === "image") addImageBlock();
            if (type === "video") addVideoBlock();
            if (type === "quiz") addQuizBlock();
        });
    });

    submitBtn.addEventListener("click", async () => {
        const title = document.getElementById("module-title").value.trim();
        const description = document.getElementById("module-description").value.trim();

        if (!title) {
            alert("Please enter a Module Title.");
            return;
        }

        const blocks = [];
        const blockElements = document.querySelectorAll(".block-card");
        
        try {
            let hasError = false;
            let uploadPending = false;

            blockElements.forEach(el => {
                if (hasError) return;

                const type = el.dataset.type;
                if (type === "text") {
                    blocks.push({
                        type: "text",
                        content: el.querySelector(".block-content").value
                    });
                } else if (type === "image" || type === "video") {
                    const finalUrl = el.querySelector(".block-url").value;
                    const fileInput = el.querySelector("input[type='file']");
                    
                    if (!finalUrl && fileInput.files.length > 0) {
                        uploadPending = true;
                    } else if (!finalUrl) {
                        hasError = true; // no file uploaded
                    }

                    if (type === "image") {
                        blocks.push({
                            type: "image",
                            url: finalUrl,
                            alt_text: el.querySelector(".block-alt").value,
                            caption: el.querySelector(".block-caption").value
                        });
                    } else {
                        blocks.push({
                            type: "video",
                            url: finalUrl,
                            caption: el.querySelector(".block-caption").value
                        });
                    }
                } else if (type === "quiz") {
                    const blockId = el.id;
                    const choicesElements = el.querySelectorAll(".choice-row");
                    const choices = [];
                    let correctIndex = 0;

                    choicesElements.forEach((ce, i) => {
                        const textVal = ce.querySelector(".choice-text").value.trim();
                        if (!textVal) hasError = true;
                        
                        choices.push({
                            text: textVal,
                            explanation: ce.querySelector(".choice-explanation").value
                        });
                        if (ce.querySelector(`input[name="correct-${blockId}"]`).checked) {
                            correctIndex = i;
                        }
                    });

                    blocks.push({
                        type: "quiz",
                        question: el.querySelector(".block-question").value,
                        choices: choices,
                        correct_index: correctIndex
                    });
                }
            });

            if (uploadPending) throw new Error("Please wait for all your files to finish uploading first.");
            if (hasError) throw new Error("Some required fields (like an image/video file or quiz choices) are missing.");

            submitBtn.textContent = "Saving...";
            submitBtn.disabled = true;

            const payload = {
                title,
                description,
                blocks
            };

            const response = await fetch("/modules/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error(errorData);
                throw new Error("Server rejected the data.");
            }

            const responseData = await response.json();

            statusMsg.innerHTML = `Module published successfully! 🎉 <br><a href="module.html?id=${responseData.id}" target="_blank" style="display:inline-block; margin-top:8px; font-weight:bold; color:var(--primary); text-decoration:underline;">&#8594; Open Learner View</a>`;
            statusMsg.className = "status-message status-success";

        } catch (err) {
            statusMsg.textContent = err.message || "Failed to publish module.";
            statusMsg.className = "status-message status-error";
        } finally {
            submitBtn.textContent = "Publish Module";
            submitBtn.disabled = false;
        }
    });

    // Initialize with one text block
    addTextBlock();
});
