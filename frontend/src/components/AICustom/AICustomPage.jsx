import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { aiCustomAPI } from '../../services/api.js';
import { BarChart, LineChart, MultiSeriesBarChart, MultiSeriesLineChart } from '../Charts';
import ErrorMessage from '../Common/ErrorMessage';

const AICustomPage = () => {
  const { theme } = useTheme();
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const recognitionRef = useRef(null);
  const [speechStatus, setSpeechStatus] = useState(null);
  const [speechError, setSpeechError] = useState(null);

  const MAX_INPUT_LENGTH = 1000;

  const getSafeErrorMessage = (rawMessage) => {
    if (!rawMessage || typeof rawMessage !== 'string') {
      return 'Something went wrong while generating your graph. Please try refining your request and try again.';
    }

    const lowerCaseMessage = rawMessage.toLowerCase();
    const sensitiveKeywords = ['relation', 'column', 'table', 'schema', 'sql', 'syntax', 'select', 'insert', 'update', 'delete', 'database'];
    const containsSensitiveKeyword = sensitiveKeywords.some(keyword => lowerCaseMessage.includes(keyword));

    if (containsSensitiveKeyword) {
      return 'Something went wrong while generating your graph. Please try refining your request and try again.';
    }

    return rawMessage;
  };

  const getSafeDescription = (text) => {
    if (!text || typeof text !== 'string') {
      return null;
    }

    const lowerCaseText = text.toLowerCase();
    const sensitiveKeywords = ['table', 'column', 'schema', 'select', 'from', 'where', 'join', 'sql', 'database', '_'];
    const containsSensitiveKeyword = sensitiveKeywords.some(keyword => lowerCaseText.includes(keyword));

    if (containsSensitiveKeyword) {
      return 'Insight generated based on your request.';
    }

    return text;
  };

  const appendTranscript = (transcript) => {
    if (!transcript) return;
    setUserInput((prev) => {
      const currentValue = prev || '';
      const available = MAX_INPUT_LENGTH - currentValue.length;
      if (available <= 0) {
        return currentValue;
      }
      const trimmedTranscript =
        transcript.length > available ? transcript.slice(0, available) : transcript;
      if (!trimmedTranscript.trim()) {
        return currentValue;
      }
      const nextValue = currentValue
        ? `${currentValue}${currentValue.endsWith(' ') ? '' : ' '}${trimmedTranscript}`.slice(0, MAX_INPUT_LENGTH)
        : trimmedTranscript;
      return nextValue;
    });
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsSpeechSupported(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSpeechSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'he-IL';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setSpeechStatus('listening');
      setSpeechError(null);
    };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join(' ');

      appendTranscript(transcript);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setSpeechStatus('stopped');
    };

    recognition.onend = () => {
      setIsListening(false);
      setSpeechStatus('stopped');
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognition && recognition.stop) {
        recognition.stop();
      }
    };
  }, []);

  const handleToggleListening = () => {
    if (!recognitionRef.current || !isSpeechSupported) return;

    if (!isListening) {
      try {
        recognitionRef.current.start();
        setSpeechStatus('starting');
        setSpeechError(null);
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
        setSpeechError('Could not access microphone. Please check permissions and try again.');
        setSpeechStatus('stopped');
      }
    } else {
      recognitionRef.current.stop();
      setIsListening(false);
      setSpeechStatus('stopped');
    }
  };

  /**
   * Checks if a value is numeric (number or numeric string)
   */
  const isNumericValue = (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'number') return Number.isFinite(value);
    if (typeof value === 'string') {
      const n = Number(value);
      return Number.isFinite(n) && value.trim() !== '';
    }
    return false;
  };

  /**
   * Transforms backend query result into chart-ready data format or table data
   * Returns: { kind: "chart" | "table" | "empty", ... }
   */
  const transformToChartData = (columns, rows) => {
    // Empty result
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return { kind: 'empty' };
    }

    // No column info: fallback to table
    if (!columns || !Array.isArray(columns) || columns.length === 0) {
      return { kind: 'table', columns: [], rows };
    }

    // First column is X-axis (labels)
    const xCol = columns[0];
    const xKey = xCol.name;

    // Find all numeric columns beyond the first
    const numericColumns = [];
    for (let i = 1; i < columns.length; i++) {
      const col = columns[i];
      const key = col.name;
      
      // Sample first 10 rows to check if column is numeric
      const sampleValues = rows.slice(0, 10).map(r => r[key]).filter(v => v !== null && v !== undefined);
      const hasNumeric = sampleValues.some(v => isNumericValue(v));
      
      if (hasNumeric) {
        numericColumns.push(col);
      }
    }

    // No numeric columns -> table view
    if (numericColumns.length === 0) {
      return { kind: 'table', columns, rows };
    }

    // Extract labels from first column
    const labels = rows.map(row => {
      const value = row[xKey];
      return value !== null && value !== undefined ? String(value) : '';
    });

    // Create series for each numeric column
    const series = numericColumns.map(col => {
      const key = col.name;
      const values = rows.map(row => {
        const v = row[key];
        if (typeof v === 'number') return v;
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      });

      return {
        key,
        label: key,
        values
      };
    });

    // For single series, create simple chart data format [{name, value}]
    // For multiple series, create multi-series format [{name, series1, series2, ...}]
    let chartData;
    if (series.length === 1) {
      // Single series: simple format
      chartData = labels.map((label, index) => ({
        name: label,
        value: series[0].values[index]
      }));
    } else {
      // Multiple series: multi-series format
      chartData = labels.map((label, index) => {
        const item = { name: label };
        series.forEach(s => {
          item[s.key] = s.values[index];
        });
        return item;
      });
    }

    return {
      kind: 'chart',
      xKey,
      labels,
      series,
      chartData,
      isMultiSeries: series.length > 1
    };
  };

  const handleGenerate = async () => {
    const trimmedInput = userInput.trim();

    // Validate input
    if (!trimmedInput) {
      setError('Please enter a description of the data or graph you want to generate.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log('[AICustomPage] Sending request to backend...');
      const response = await aiCustomAPI.queryData(trimmedInput);
      const data = response.data;

      console.log('[AICustomPage] Backend response:', data);

      // Handle different statuses
      if (data.status === 'no_match') {
        setError(data.message || 'No matching tables or columns found for your request. Please try rephrasing.');
        setLoading(false);
        return;
      }

      if (data.status === 'error') {
        setError(data.message || 'An error occurred while processing your request.');
        setLoading(false);
        return;
      }

      if (data.status === 'ok') {
        // Transform to chart/table data
        const transformed = transformToChartData(data.columns, data.rows);

        // Store the result with transformation info
        setResult({
          sql: data.sql,
          reason: data.reason,
          rowCount: data.rowCount,
          columns: data.columns,
          rows: data.rows,
          transformed
        });

        setLoading(false);
      } else {
        setError('Unexpected response status from server.');
        setLoading(false);
      }
    } catch (err) {
      console.error('[AICustomPage] Error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'An unexpected error occurred while generating the graph.';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const safeResultReason = result ? getSafeDescription(result.reason) : null;

  return (
    <div className="min-h-screen py-8">
      {/* Welcome Message */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
          Welcome to AI-generated graph
        </h1>
      </div>

      {/* Input Card */}
      <div className="max-w-3xl mx-auto mb-8">
        <div className="card">
          {/* Textarea */}
          <div className="mb-6">
            <label htmlFor="ai-custom-input" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Describe your data insight or custom graph
            </label>
            <div className="relative">
              <textarea
                id="ai-custom-input"
                value={userInput}
                onChange={(e) => {
                  if (e.target.value.length <= 1000) {
                    setUserInput(e.target.value);
                  }
                }}
                placeholder="Describe the data insight or custom graph you want..."
                className="w-full min-h-[150px] p-4 pr-16 pb-16 border-2 border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-50 placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-y"
                maxLength={MAX_INPUT_LENGTH}
              />
              <button
                type="button"
                onClick={handleToggleListening}
                disabled={!isSpeechSupported}
                className={
                  'absolute bottom-3 right-3 flex h-10 w-10 items-center justify-center rounded-full shadow-md transition-colors ' +
                  (isSpeechSupported ? '' : 'opacity-40 cursor-not-allowed ') +
                  (isListening
                    ? 'bg-error-600 hover:bg-error-700 text-white'
                    : 'bg-primary-600 hover:bg-primary-700 text-neutral-50')
                }
                title={
                  !isSpeechSupported
                    ? 'Speech recognition is not supported in this browser'
                    : isListening
                    ? 'Click to stop dictation'
                    : 'Click to start dictation'
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                >
                  <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3z" />
                  <path d="M19 11a1 1 0 1 0-2 0 5 5 0 0 1-10 0 1 1 0 1 0-2 0 7 7 0 0 0 6 6.92V20H9a1 1 0 1 0 0 2h6a1 1 0 1 0 0-2h-2v-2.08A7 7 0 0 0 19 11z" />
                </svg>
              </button>
            </div>
            {!isSpeechSupported && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                Speech recognition is not supported in this browser. Try using the latest version of Chrome.
              </p>
            )}
            {speechStatus === 'listening' && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                Listening…
              </p>
            )}
            {speechError && (
              <p className="text-sm text-error-600 dark:text-error-400 mt-2">
                {speechError}
              </p>
            )}
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
              Describe the data insight or custom graph you want (up to 1000 characters).
            </p>
            <div className="text-right text-sm text-neutral-500 dark:text-neutral-400 mt-1">
              {userInput.length} / 1000 characters
            </div>
          </div>

          {/* Generate Button */}
          <div className="text-center">
            <button
              onClick={handleGenerate}
              disabled={!userInput.trim() || loading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Generating...' : 'Generate graph'}
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="max-w-6xl mx-auto">
          <div className="card">
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700 dark:border-primary-400"></div>
              <p className="text-neutral-600 dark:text-neutral-400 mt-4">
                Generating your custom graph...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="max-w-6xl mx-auto">
          <ErrorMessage 
            message={getSafeErrorMessage(error)} 
            onRetry={handleGenerate}
          />
        </div>
      )}

      {/* Result Display (Chart, Table, or Empty) */}
      {result && !loading && !error && (
        <div className="max-w-6xl mx-auto">
          <div className="card">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mb-2">
                {result.transformed.kind === 'chart' ? 'AI-Generated Graph' : 'Query Results'}
              </h2>
              {safeResultReason && (
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4">
                  {safeResultReason}
                </p>
              )}
              <div className="text-xs text-neutral-500 dark:text-neutral-500 mb-4">
                <span className="font-semibold">Rows:</span>{' '}
                {typeof result.rowCount === 'number'
                  ? result.rowCount
                  : Array.isArray(result.rows)
                  ? result.rows.length
                  : 0}
                {result.columns && result.columns.length > 0 && (
                  <>
                    <span className="mx-2">|</span>
                    <span className="font-semibold">Columns:</span> {result.columns.length}
                  </>
                )}
              </div>
            </div>

            {/* Chart Display */}
            {result.transformed.kind === 'chart' && (
              <div className="w-full" style={{ height: '400px' }}>
                {(() => {
                  const firstLabel = result.transformed.labels[0] || '';
                  const isTimeSeries = /^\d{4}-\d{2}-\d{2}|^\d{2}\/\d{2}\/\d{4}|^\d{4}-\d{2}$|month|year|date|time/i.test(firstLabel);
                  
                  const chartProps = {
                    data: result.transformed.chartData,
                    width: '100%',
                    height: 400,
                    colorScheme: { primary: '#6366f1', secondary: '#818cf8', gradient: ['#6366f1', '#818cf8', '#a5b4fc'] }
                  };

                  if (result.transformed.isMultiSeries) {
                    // Multi-series chart
                    return isTimeSeries ? (
                      <MultiSeriesLineChart {...chartProps} />
                    ) : (
                      <MultiSeriesBarChart {...chartProps} />
                    );
                  } else {
                    // Single series chart
                    return isTimeSeries ? (
                      <LineChart {...chartProps} />
                    ) : (
                      <BarChart {...chartProps} />
                    );
                  }
                })()}
              </div>
            )}

            {/* Table Display */}
            {result.transformed.kind === 'table' && (
              <div>
                <div className="mb-4 p-3 bg-info-50 dark:bg-info-900/30 border border-info-200 dark:border-info-700 rounded-lg">
                  <p className="text-sm text-info-800 dark:text-info-200">
                    This result has no numeric columns suitable for charting, so it is shown as a table.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-neutral-100 dark:bg-neutral-700">
                        {result.columns.map((col, idx) => (
                          <th
                            key={idx}
                            className="px-4 py-2 text-left text-sm font-semibold text-neutral-900 dark:text-neutral-50 border-b border-neutral-300 dark:border-neutral-600"
                          >
                            {col.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, rowIdx) => (
                        <tr
                          key={rowIdx}
                          className="border-b border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                        >
                          {result.columns.map((col, colIdx) => (
                            <td
                              key={colIdx}
                              className="px-4 py-2 text-sm text-neutral-700 dark:text-neutral-300"
                            >
                              {row[col.name] !== null && row[col.name] !== undefined
                                ? String(row[col.name])
                                : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Empty State */}
            {result.transformed.kind === 'empty' && (
              <div className="text-center py-12">
                <p className="text-neutral-500 dark:text-neutral-400 text-lg">
                  No data to display for this query.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty State (no result, no loading, no error) */}
      {!result && !loading && !error && (
        <div className="max-w-6xl mx-auto">
          <div className="card border-2 border-dashed border-neutral-300 dark:border-neutral-600">
            <div className="text-center py-12">
              <p className="text-neutral-500 dark:text-neutral-400 text-lg">
                Your custom AI-generated graph will appear here.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AICustomPage;

