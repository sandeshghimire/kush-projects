"use client";

import dynamic from "next/dynamic";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
}

export default function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
    return (
        <div data-color-mode="light" className="w-full">
            <MDEditor
                value={value}
                onChange={(val) => onChange(val ?? "")}
                height={500}
                style={{ minHeight: 500 }}
            />
        </div>
    );
}
