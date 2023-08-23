import { extname, join, tempDir } from "@tauri-apps/api/path";
import { writeBinaryFile } from "@tauri-apps/plugin-fs";
import MarkdownIt from "markdown-it";
import { escapeHtml } from "markdown-it/lib/common/utils";
import { nanoid } from "nanoid";

export function userToEntity(user: User): Entity {
    return { type: "user", uid: user.uid };
}

export function groupToEntity(group: Group): Entity {
    return { type: "group", uid: group.uid };
}

export function filterEntities(entities: Entity[], type: EntityType): string[] {
    return entities
        .filter((entity) => entity.type === type)
        .map((entity) => entity.uid);
}

export function messageElementsToString(elements: MessageNonSendableElement[]) {
    return elements
        .map((element) => {
            if (element.type === "text")
                return element.content.replaceAll("\n", " ");
            else if (element.type === "image") return "[图片]";
            else if (element.type === "face") return "[表情]";
            else return "";
        })
        .join("");
}

export async function messageElementsToHTMLAndPlainText(
    elements: MessageNonSendableElement[],
    entity: Entity,
    messaging: Messaging,
    fs: Filesystem,
    markdownIt: MarkdownIt,
) {
    return await Promise.all(
        elements.map(async (element) => {
            let child = "";
            let textChild = "";
            if (element.type === "reply") {
                const text = element.sourceMessageText;
                const sourceMessage = (
                    await messaging.getPreviousMessagesBySeq(
                        entity,
                        7,
                        element.sourceMessageSeq,
                        false,
                    )
                )?.[0];
                child = `<blockquote>${escapeHtml(
                    `[回复] ${
                        sourceMessage
                            ? `${
                                  sourceMessage.sender.memberName ||
                                  sourceMessage.sender.name
                              }: `
                            : ""
                    }${text}`,
                )}</blockquote><br>`;
                textChild = `[回复] ${element.sourceMessageText}\n`;
            } else if (element.type === "revoke") {
                const text = element.isRevokedBySelf
                    ? `${
                          element.sender.memberName || element.sender.name
                      } 撤回了一条消息`
                    : `${
                          element.operator.memberName || element.operator.name
                      } 撤回了 ${
                          element.sender.memberName || element.sender.name
                      }`;
                child = `<i>${escapeHtml(text)}</i>`;
                textChild = text;
            } else if (element.type === "text") {
                child = markdownIt.render(element.content);
                textChild = element.content;
            } else if (element.type === "mention") {
                const text = element.content;
                child = escapeHtml(text);
                textChild = text;
            } else if (element.type === "image") {
                const file = await element.progress;
                const data = await fs.readBinaryFile(file);
                const temp = await join(
                    await tempDir(""),
                    `${nanoid()}.${await extname(file)}`,
                );
                writeBinaryFile(temp, data);
                child = `<img src="${temp}" alt="">`;
                textChild = "[图片]";
            } else if (element.type === "face") {
                const text = "[动画表情]";
                child = escapeHtml(text);
                textChild = text;
            } else if (element.type === "file") {
                const text = `[文件: ${element.name}]`;
                child = escapeHtml(text);
                textChild = text;
            } else if (element.type === "raw") {
                const text = `[不支持渲染此元素: ${JSON.stringify(
                    element.raw,
                )}]`;
                child = escapeHtml(text);
                textChild = text;
            }
            return [child, textChild];
        }),
    );
}
