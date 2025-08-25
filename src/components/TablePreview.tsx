"use client";

interface Props {
  data: string[][];
}

export default function TablePreview({ data }: Props) {
  if (!data.length) return null;

  return (
    <div className="overflow-x-auto mt-6 bg-black p-4 rounded-lg">
      <table className="min-w-full text-sm text-white border border-gray-700">
        <thead>
          <tr>
            {data[0].map((col, i) => (
              <th key={i} className="px-3 py-2 border border-gray-600">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.slice(1, 6).map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 border border-gray-600">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {data.length > 6 && (
        <p className="text-gray-400 mt-2">Showing first 5 rows...</p>
      )}
    </div>
  );
}
