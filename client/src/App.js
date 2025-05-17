import React, { useState } from 'react';
import axios from 'axios';
import {
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts';

function App() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [sql, setSql] = useState('');
  const [error, setError] = useState(null);

  const askQuestion = async () => {
  setError(null);
  setAnswer(null);
  setSql('');

  try {
    const response = await axios.post(
      `${process.env.REACT_APP_API_BASE_URL}/ask`,
      { query: question }
    );

    setSql(response.data.sql);
    setAnswer(response.data.results);
  } catch (err) {
    setError(err.response?.data?.error || 'Failed to get answer');
  }
};


  const renderTable = () => {
    if (!answer || answer.length === 0) return <p>No data returned.</p>;

    const headers = Object.keys(answer[0]);
    return (
      <table border="1" cellPadding="5" style={{ marginTop: 20 }}>
        <thead>
          <tr>
            {headers.map((h) => <th key={h}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {answer.map((row, i) => (
            <tr key={i}>
              {headers.map((h) => <td key={h}>{row[h]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderChart = () => {
    if (!answer || answer.length === 0) return null;

    const hasPrice = answer[0].hasOwnProperty('price');
    const hasQuantity = answer[0].hasOwnProperty('quantity');

    // If neither price nor quantity exist, no chart is rendered
    if (!hasPrice && !hasQuantity) return null;

    // Use 'id' if present, else first key as X axis
    const xKey = answer[0].hasOwnProperty('id') ? 'id' : Object.keys(answer[0])[0];

    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={answer}>
          {hasPrice && <Line type="monotone" dataKey="price" stroke="#8884d8" />}
          {hasQuantity && <Line type="monotone" dataKey="quantity" stroke="#82ca9d" />}
          <CartesianGrid stroke="#ccc" />
          <XAxis dataKey={xKey} />
          <YAxis />
          <Tooltip />
        </LineChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>AI Data Agent</h1>
      <textarea
        rows="3"
        style={{ width: '100%', fontSize: 16 }}
        placeholder="Ask a complex business question..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <button onClick={askQuestion} style={{ marginTop: 10, padding: '10px 20px' }}>
        Ask
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {sql && (
        <>
          <h3>Generated SQL:</h3>
          <pre>{sql}</pre>
        </>
      )}

      {answer && (
        <>
          <h3>Results:</h3>
          {renderTable()}
          {renderChart()}
        </>
      )}
    </div>
  );
}

export default App;
