import API from '../../../../api.js';
import SharpRoute from '../SharpRoute.js';

export default class ImageManager {
    public readonly logger: API['logger'];

    public constructor (public readonly sharpRoute: SharpRoute) {
        this.logger = sharpRoute.logger;
    }

}
