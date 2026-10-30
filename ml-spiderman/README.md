# Spider-Verse Incident Analysis (Machine Learning task, 1st year)

A Jupyter/Colab notebook that cleans, explores and models the "Spiderman-dataset": 540 raw Spider-Verse incident records with deliberate data-quality problems.

- **Notebook:** [`spiderman_analysis.ipynb`](spiderman_analysis.ipynb)
- **Open in Colab:** https://colab.research.google.com/github/agharshu17/bitespeed/blob/claude/vigilant-pascal-dy3rzx/ml-spiderman/spiderman_analysis.ipynb

## Dataset source
[Spiderman-dataset (Google Sheet)](https://docs.google.com/spreadsheets/d/1mvk2qKRA0Ol0pYCdj-fETSfNvWHAoPcErwWak9CIGsk/edit?gid=676581019), provided with the task. A copy is saved here as `spiderman_raw.csv`; the notebook downloads the sheet and falls back to this copy if it is unreachable.

## Libraries used
Python 3, pandas, NumPy, Matplotlib, Seaborn, scikit-learn.

## How to run
**Colab (easiest):** open the Colab link above, then *Runtime -> Run all*. All libraries are pre-installed.

**Locally:**
```bash
pip install pandas numpy matplotlib seaborn scikit-learn jupyter
jupyter notebook spiderman_analysis.ipynb
```
Run it from this folder so the fallback `spiderman_raw.csv` can be found.

## What the notebook covers
| Requirement | Section |
|---|---|
| Data understanding (shape, columns, types, meaning) | 1 |
| Data cleaning (duplicates, formats, types, missing values, outliers), with the reason for each fix | 2 |
| EDA: summary statistics, distributions, relationships, written observations | 3 |
| 8 graphs, each with a title, labelled axes and an interpretation | 3 |
| Preprocessing: encoding, scaling, stratified train/test split | 4 |
| Bonus: baseline model (logistic regression vs majority-class baseline) | 5 |

## Key findings
- 540 raw rows became **500 unique incidents** after removing duplicates; 26 spellings of 5 universes were unified.
- Incidents with a detected anomaly take about **22 min** to respond to, versus about **9 min** without one.
- Average city damage rises with threat level: about 23 (Low), 32 (Medium), 44 (High).
- Baseline model (predict `threat_level`): **78% accuracy / 0.74 macro F1**, versus 50% / 0.22 for always predicting the most common class. The High class has only 15 examples, so its result is unreliable.
