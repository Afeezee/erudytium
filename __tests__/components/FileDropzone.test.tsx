import { fireEvent, render, screen } from "@testing-library/react";
import { FileDropzone } from "@/components/ui/FileDropzone";

describe("FileDropzone", () => {
  it("shows a dynamic file type and size hint", () => {
    render(
      <FileDropzone
        accept={{
          "application/pdf": [".pdf"],
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"]
        }}
        maxSize={5 * 1024 * 1024}
        file={null}
        onFileSelect={jest.fn()}
      />
    );

    expect(screen.getByText("PDF, DOCX up to 5.0 MB. Click to browse.")).toBeInTheDocument();
  });

  it("returns a size validation error when the file exceeds the limit", () => {
    const onFileSelect = jest.fn();
    const { container } = render(
      <FileDropzone
        accept={{
          "application/pdf": [".pdf"]
        }}
        maxSize={1 * 1024 * 1024}
        file={null}
        onFileSelect={onFileSelect}
      />
    );

    const input = container.querySelector('input[type="file"]');
    const oversizedFile = new File([new Uint8Array(2 * 1024 * 1024)], "notes.pdf", { type: "application/pdf" });

    expect(input).not.toBeNull();

    fireEvent.change(input!, { target: { files: [oversizedFile] } });

    expect(onFileSelect).toHaveBeenCalledWith(null, "This file is 2.0 MB. The upload limit is 1.0 MB.");
  });
});