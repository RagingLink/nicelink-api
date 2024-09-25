//import _ from 'lodash';

import ImageFetcher from './ImageFetcher.js';
import OperationHandler from './OperationHandler.js';

import { DefaultLogger } from '../../../../utils/logging/NiceLogger.js';
import Timer from '../../../../utils/Timer.js';
import Image from '../Image.js';
import { validateRootInput } from '../validateInput.js';
import { CompletedOperationObject } from '../Context.js';
import { GenericObjectType } from '../../../../utils/typebox/index.js';

export type CachedOperationMap = Record<string, CachedOperation[]>;
export type CachedOperation = (CompletedOperationObject) & {
    buffer: Buffer;
    nextOperationMap?: CachedOperationMap;
};

export class ImageEditor {
    public readonly fetcher: ImageFetcher;
    public readonly operationHandler: OperationHandler;
    public constructor(public readonly logger: DefaultLogger) {
        this.fetcher = new ImageFetcher(logger);
        this.operationHandler = new OperationHandler(logger);
    }

    public async editImage(input: GenericObjectType): Promise<Image> {
        const editImageTimer = new Timer(true);
        const validatedInput = validateRootInput(input);

        if (validatedInput === undefined)
            return new Image(this.logger, this.fetcher.defaultImageBuffer, 'Invalid input', 0); // TODO HANDLE INVALID INPUT

        const image = this.createDefaultImage(validatedInput.background);

        // Use the cache of any operation that is already cached
        const cachedImage = this.operationHandler.getCachedBuffer(image, validatedInput);
        // If not cached, fetch the image
        if (cachedImage === undefined) {
            const fetchTimer = new Timer(true);
            const imageBuffer = await this.fetcher.fetchImage(validatedInput.background);
            if (imageBuffer === undefined) {
                image.fetchDuration = Number(fetchTimer.elapsedMS);
                image.context.addDebug('error', `Invalid background source: ${validatedInput.background}`);
                return image;
            }
            image.setBuffer(imageBuffer);
            image.fetchDuration = Number(fetchTimer.elapsedMS);
        } else {
            image.setBuffer(cachedImage.buffer);
        }

        const remainingOperations = cachedImage !== undefined ? cachedImage.remainingOperations : validatedInput.operations;
        // Execute operations that are not cached
        for (const inputObj of remainingOperations) {
            const operation = this.operationHandler.getOperation(image.context, inputObj);
            // I'm thinking of handling the errors here instead of in getOperation
            if (operation === undefined)
                continue;

            const opTimer = new Timer(true);
            await operation.execute(image, inputObj.data);
            this.logger.log.operation(`Executed ${inputObj.type}`, opTimer.elapsedBlueStr);
        }

        this.operationHandler.cacheOperations(image);
        this.logger.log.image('editImageTimer', editImageTimer.elapsedBlueStr);

        return image;
    }

    private createDefaultImage(src = ''): Image {
        return new Image(this.logger, this.fetcher.defaultImageBuffer, src);
    }

}
