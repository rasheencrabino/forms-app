"use client";

interface OptionsEditorProps {
  options: string[];
  onChange: (options: string[]) => void;
}

export function OptionsEditor({ options, onChange }: OptionsEditorProps) {
  return (
    <div className="options-editor">
      {options.map((option, idx) => (
        // eslint-disable-next-line react/no-array-index-key
        <div className="options-editor__row" key={idx}>
          <input
            type="text"
            value={option}
            placeholder={`Option ${idx + 1}`}
            onChange={(e) => {
              const next = [...options];
              next[idx] = e.target.value;
              onChange(next);
            }}
          />
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            disabled={options.length <= 1}
            onClick={() => onChange(options.filter((_, i) => i !== idx))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn--secondary btn--sm"
        onClick={() => onChange([...options, `Option ${options.length + 1}`])}
      >
        + Add option
      </button>
    </div>
  );
}
