import Avatar from "./Avatar";
import { PlusIcon } from "./Icons";
import { stories } from "../data";

export default function Stories() {
  return (
    <div className="card stories">
      <div className="story story--add">
        <span className="story__plus">
          <PlusIcon size={24} />
        </span>
        <span className="story__name">Создать историю</span>
      </div>
      {stories.map((s) => (
        <div
          key={s.id}
          className={`story ${s.seen ? "story--seen" : ""}`}
          style={{ background: s.preview }}
        >
          <span className="story__avatar">
            <Avatar name={s.person.name} color={s.person.color} size={32} />
          </span>
          <span className="story__name">{s.person.name.split(" ")[0]}</span>
        </div>
      ))}
    </div>
  );
}
