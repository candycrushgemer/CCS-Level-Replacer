const filePicker = document.getElementById('filePicker');
const fileNameSpan = document.getElementById('fileName');
const processBtn = document.getElementById('processBtn');
const levelDefinitionIdInput = document.getElementById('levelDefinitionId_meta');
const idMetaInput = document.getElementById('id_meta');

let selectedFilePath = null;
let selectedFileContent = null;

function showErrorDialog(message) {
  window.electronAPI.showMessage({
    type: 'error',
    buttons: ['OK'],
    defaultId: 0,
    title: 'Error',
    message,
    icon: 'error'
  });
}

function showSuccessDialog(message) {
  window.electronAPI.showMessage({
    type: 'info',
    buttons: ['OK'],
    defaultId: 0,
    title: 'Success',
    message,
    icon: 'info'
  });
}

function showWarningDialog(message) {
  window.electronAPI.showMessage({
    type: 'warning',
    buttons: ['OK'],
    defaultId: 0,
    title: 'Warning',
    message,
    icon: 'warning'
  });
}

function showAboutDialog() {
  window.electronAPI.showMessage({
    type: 'info',
    buttons: ['OK'],
    defaultId: 0,
    title: 'About',
    message: 'CCS Level Replacer\nVersion 1.0 (Stable)\nCopyright © 2025 [CCGApps](https://ccgapps.web.app/).',
    icon: 'ccgapps'
  });
}

filePicker.addEventListener('click', async () => {
  const filePath = await window.electronAPI.openFile();
  if (filePath) {
    selectedFilePath = filePath;
    fileNameSpan.textContent = filePath.split(/[\\/]/).pop();
    selectedFileContent = await window.electronAPI.readFile(filePath);
  }
});

// Add about click handler
document.addEventListener('DOMContentLoaded', () => {
  const aboutLink = document.querySelector('#aboutApp');
  if (aboutLink) {
    aboutLink.addEventListener('click', (e) => {
      e.preventDefault();
      showAboutDialog();
    });
  }
});

processBtn.addEventListener('click', async () => {
  if (!selectedFilePath || !selectedFileContent) {
    showErrorDialog('No files loaded...');
    return;
  }
  const levelDefinitionId = levelDefinitionIdInput.value.trim();
  const idMeta = idMetaInput.value.trim();
  if (!levelDefinitionId || !idMeta) {
    showErrorDialog('Level ID and Target level not entered!');
    return;
  }

  // Check if file already contains the keys
  if (selectedFileContent.includes('"levelDefinitionId_meta"') && selectedFileContent.includes('"id_meta"')) {
    showWarningDialog('File already contains levelDefinitionId_meta and id_meta. Sweet!');
    return;
  }

  // Try to parse as JSON, else treat as text
  let newContent;
  try {
    const json = JSON.parse(selectedFileContent);
    json.levelDefinitionId_meta = levelDefinitionId;
    json.id_meta = idMeta;
    newContent = JSON.stringify(json, null, 2);
  } catch (e) {
    // Not valid JSON, insert before first bracket
    const idx = selectedFileContent.indexOf('{');
    if (idx !== -1) {
      newContent = selectedFileContent.slice(0, idx+1) + `\n  \"levelDefinitionId_meta\":\"${levelDefinitionId}\",\n  \"id_meta\":\"${idMeta}\",` + selectedFileContent.slice(idx+1);
    } else {
      showErrorDialog('File format not recognized.');
      return;
    }
  }

  // Save new file to CCS path
  const userProfile = await window.electronAPI.getUserProfile();
  const ccsDir = `${userProfile}\\AppData\\Local\\Packages\\king.com.CandyCrushSaga_kgqvnymyfvs32\\LocalCache\\Cache\\levelapi\\main_progression\\levels`;
  const newFilePath = `${ccsDir}\\${levelDefinitionId}.json`;
  
  try {
    await window.electronAPI.saveFile(newFilePath, newContent);
  } catch (err) {
    showErrorDialog(`Path/file does not exist! Make sure Candy Crush is installed. \nPath: ${ccsDir}`);
    return;
  }

  // Find and update levelapi_xxxxxxx and levelapirepository_xxxxxxx
  const mainProgressionDir = `${userProfile}\\AppData\\Local\\Packages\\king.com.CandyCrushSaga_kgqvnymyfvs32\\LocalCache\\Cache\\levelapi\\main_progression`;
  
  try {
    const apiFiles = await window.electronAPI.findFiles(mainProgressionDir, /^levelapi_\\d{11}$/);
    const repoFiles = await window.electronAPI.findFiles(mainProgressionDir, /^levelapirepository_\\d{11}$/);
    
    // Debug: Get all files in directory to see what's actually there
    const allFiles = await window.electronAPI.getAllFiles(mainProgressionDir);
    
    // Test regex patterns
    const apiPattern = /^levelapi_\d{11}$/;
    const repoPattern = /^levelapirepository_\d{11}$/;
    
    // Manual check - if findFiles is failing, use the files we know exist
    if (!apiFiles.length || !repoFiles.length) {
      const manualApiFiles = allFiles.filter(f => apiPattern.test(f));
      const manualRepoFiles = allFiles.filter(f => repoPattern.test(f));
      
      if (manualApiFiles.length && manualRepoFiles.length) {
        const apiFile = manualApiFiles[0];
        const repoFile = manualRepoFiles[0];
        // Write to levelapi_xxxxxxx
        const apiContent = `{"levels":"[{\"i\":${idMeta},\"def\":${levelDefinitionId}}]"}`;
        await window.electronAPI.saveFile(`${mainProgressionDir}\\${apiFile}`, apiContent);
        // Write to levelapirepository_xxxxxxx
        // Try to preserve ts from existing file
        let repoTs = Date.now();
        try {
          const repoRaw = await window.electronAPI.readFile(`${mainProgressionDir}\\${repoFile}`);
          const repoJson = JSON.parse(repoRaw);
          if (repoJson.levels) {
            const match = repoJson.levels.match(/"ts":(\d+)/);
            if (match) repoTs = match[1];
          }
        } catch {}
        const repoContent = `{"levels":"[{\"def\":${levelDefinitionId},\"ts\":${repoTs}}]"}`;
        await window.electronAPI.saveFile(`${mainProgressionDir}\\${repoFile}`, repoContent);
      } else {
        throw new Error(`Required files not found. Manual API files: ${manualApiFiles.length}, Manual repo files: ${manualRepoFiles.length}`);
      }
    } else {
      // Use the original findFiles results
      const apiFile = apiFiles[0];
      const repoFile = repoFiles[0];
      // Write to levelapi_xxxxxxx
      const apiContent = `{"levels":"[{\"i\":${idMeta},\"def\":${levelDefinitionId}}]"}`;
      await window.electronAPI.saveFile(`${mainProgressionDir}\\${apiFile}`, apiContent);
      // Write to levelapirepository_xxxxxxx
      // Try to preserve ts from existing file
      let repoTs = Date.now();
      try {
        const repoRaw = await window.electronAPI.readFile(`${mainProgressionDir}\\${repoFile}`);
        const repoJson = JSON.parse(repoRaw);
        if (repoJson.levels) {
          const match = repoJson.levels.match(/"ts":(\d+)/);
          if (match) repoTs = match[1];
        }
      } catch {}
      const repoContent = `{"levels":"[{\"def\":${levelDefinitionId},\"ts\":${repoTs}}]"}`;
      await window.electronAPI.saveFile(`${mainProgressionDir}\\${repoFile}`, repoContent);
    }
  } catch (err) {
    showErrorDialog(`Path/file not found! Please ensure Candy Crush Saga is installed and has been run at least once.\nPath: ${mainProgressionDir}`);
    return;
  }

  showSuccessDialog('Operation completed.');

  // Ask user if they want to play now
  const result = await window.electronAPI.showMessage({
    type: 'question',
    buttons: ['Yes', 'No'],
    defaultId: 0,
    cancelId: 1,
    title: 'Success',
    message: 'Done! Play the game now?',
    icon: 'help'
  });
  if (result.response === 0) {
    try {
      await window.electronAPI.disableWifiAndLaunchCCS();
    } catch (err) {
      showErrorDialog('Failed to launch game or turn off Wi-Fi!');
    }
  }
}); 