import { plural } from "../../utils";
export { formatDuration } from "../music/format";

export const viewsLabel = (n: number) => `${n.toLocaleString("ru-RU")} ${plural(n, ["просмотр", "просмотра", "просмотров"])}`;
