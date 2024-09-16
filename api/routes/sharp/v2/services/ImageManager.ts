import { DefaultLogger } from '../../../../utils/logging/NiceLogger.js';
import Image from '../Image.js';
import { ImageEditor } from './ImageEditor.js';

export default class ImageManager {
    private readonly editor: ImageEditor;

    public constructor (public readonly logger: DefaultLogger) {
        this.editor = new ImageEditor(logger);
    }

    public async postImage(input: JObject): Promise<Image> {
        const image = await this.editor.editImage(input);
        return image;
    }
}
