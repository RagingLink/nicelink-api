//import _ from 'lodash';

import ImageFetcher from './ImageFetcher.js';

import { DefaultLogger } from '../../../../utils/logging/NiceLogger.js';
import Timer from '../../../../utils/Timer.js';
import { SuccessOperation } from '../Context.js';
import Image from '../Image.js';
import OperationHandler from '../OperationHandler.js';
import { validateRootInput } from '../validateInput.js';

export type CachedOperation = (SuccessOperation) & {
    nextOperations?: CachedOperation[];
};

export class ImageEditor {
    public readonly fetcher: ImageFetcher;
    public readonly operationHandler: OperationHandler;
    public constructor(public readonly logger: DefaultLogger) {
        this.fetcher = new ImageFetcher(logger);
        this.operationHandler = new OperationHandler(logger);
    }

    public async editImage(input: JObject): Promise<Image> {
        const editImageTimer = new Timer(true);
        const validatedInput = validateRootInput(input);

        if (validatedInput === undefined)
            return new Image(this.logger, this.fetcher.defaultImageBuffer, 'invalid'); // TODO HANDLE INVALID INPUT

        const imageBuffer = await this.fetcher.fetchImage(validatedInput.background);
        if (imageBuffer === undefined)
            return new Image(this.logger, this.fetcher.defaultImageBuffer, 'invalid'); // TODO HANDLE INVALID BACKGROUND

        const image = new Image(this.logger, imageBuffer, validatedInput.background);
        // Caching vars
        const operationCache = this.operationHandler.getBuffer(image, validatedInput);
        if (operationCache !== undefined)
            image.setBuffer(operationCache.buffer);

        for (const inputObj of operationCache !== undefined ? operationCache.remainingOperations : validatedInput.operations) {
            const opTimer = new Timer(true);
            const operation = this.operationHandler.getOperation(image.context, inputObj);
            if (operation === undefined)
                continue;

            await operation.execute(image, inputObj.data);
            this.logger.log.operation(operation.name, opTimer.elapsedBlueStr);
        }

        this.operationHandler.cacheOperations(image);
        this.logger.log.image('editImageTimer', editImageTimer.elapsedBlueStr);

        return image;
    }

}
