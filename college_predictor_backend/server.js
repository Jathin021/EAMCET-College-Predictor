const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Path to your JSON data folder
const DATA_FOLDER = path.join(__dirname, 'data');

// Load JSON files synchronously at startup
const phase1_data = JSON.parse(fs.readFileSync(path.join(DATA_FOLDER, 'first_phase.json'), 'utf-8'));
const phase2_data = JSON.parse(fs.readFileSync(path.join(DATA_FOLDER, 'second_phase.json'), 'utf-8'));
const final_phase_data = JSON.parse(fs.readFileSync(path.join(DATA_FOLDER, 'final_phase.json'), 'utf-8'));

function normalizeKey(key) {
    return key.replace(/\n/g, '').replace(/ /g, '').replace(/-/g, '_').toUpperCase();
}

function calculateRankRange(rank) {
    if (rank < 10000) {
        return [Math.max(1, rank - 2000), rank + 2000];
    } else if (rank < 50000) {
        return [rank - 5000, rank + 5000];
    } else {
        return [rank - 10000, rank + 10000];
    }
}

function filterColleges(data, minRank, maxRank, categoryGender, branchName) {
    const categoryGenderNorm = normalizeKey(categoryGender);
    const branchNameNorm = branchName.trim().toUpperCase();
    const filtered = [];

    data.forEach(college => {
        if (!college["Branch Name"] || college["Branch Name"].trim().toUpperCase() !== branchNameNorm) {
            return;
        }

        const normalizedCollege = {};
        for (const key in college) {
            normalizedCollege[normalizeKey(key)] = college[key];
        }

        if (!(categoryGenderNorm in normalizedCollege)) {
            return;
        }

        const cutoff = parseInt(normalizedCollege[categoryGenderNorm], 10);
        if (isNaN(cutoff)) {
            return;
        }

        if (cutoff >= minRank && cutoff <= maxRank) {
            filtered.push(college);
        }
    });

    return filtered.slice(0, 100);
}

app.get('/', (req, res) => {
    res.send('Express server running!');
});

app.post('/api/predict-colleges', (req, res) => {
    const { rank, categoryGender, branchName } = req.body;

    if (!rank || !categoryGender || !branchName) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const rankInt = parseInt(rank, 10);
    if (isNaN(rankInt)) {
        return res.status(400).json({ error: 'Rank must be an integer' });
    }

    const [minRank, maxRank] = calculateRankRange(rankInt);

    const result = {
        Phase_1: filterColleges(phase1_data, minRank, maxRank, categoryGender, branchName),
        Phase_2: filterColleges(phase2_data, minRank, maxRank, categoryGender, branchName),
        Final_Phase: filterColleges(final_phase_data, minRank, maxRank, categoryGender, branchName)
    };

    res.json(result);
});

const port = 8000;
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
