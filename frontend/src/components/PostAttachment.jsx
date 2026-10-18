import Icon from "./Icon.jsx";
import { fileSize } from "../utils/format.js";

// An announcement's photo (shown in full; opens in a new tab) or file (downloads)
export default function PostAttachment({ file }) {
  if (!file) return null;
  if (file.type === "image") {
    return (
      <a href={file.url} target="_blank" rel="noreferrer" className="post-photo" title={file.name}>
        <img src={file.url} alt={file.name} loading="lazy" />
      </a>
    );
  }
  return (
    <a href={file.url} className="post-file" download={file.name}>
      <span className="msg-file-icon" aria-hidden="true"><Icon name="file" size={18} /></span>
      <span className="msg-file-text">
        <strong>{file.name}</strong>
        <span>{fileSize(file.size)} · Download</span>
      </span>
      <Icon name="download" size={16} className="post-file-dl" />
    </a>
  );
}
