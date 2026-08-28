# Query Interpretation & Aggregation Guidelines

When the user's query references a metric or quantity that is NOT an exact column name in the dataset (e.g., "headcount", "count", "number of employees", "total customers", "volume", "orders count"):
1. **Never sum or aggregate unrelated numeric columns** to approximate non-existent metric names.
2. **Interpret as a row count**: Set the aggregation type to `"count"` and group by the categorical or duration field most relevant to the query (e.g., for "headcount trend by years at company", group by `YearsAtCompany` and count rows; for "attrition by department", group by `Department` and count rows).
3. **Strict Sum/Average Restrictions**: Only use `"sum"` or `"avg"` aggregation when the query explicitly references a numeric column that actually exists in the active dataset schema (e.g., "total sales", "average salary", "total profit").
4. **Default to Count on Uncertainty**: If there is uncertainty whether a term maps directly to an existing column or is an implicit quantity/count metric, always default to `"count"` rather than summing unrelated numeric fields.
5. **Chart Mapping for Discrete Variables**: Tenure, experience, duration, or age metrics (e.g., `YearsAtCompany`, `Age`, `TotalWorkingYears`) are discrete intervals, not continuous calendar time series. Render them as bar charts sorted ascending.
