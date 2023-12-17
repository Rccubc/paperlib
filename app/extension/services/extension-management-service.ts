import fs from "fs";
import { IPluginInfo, PluginManager } from "live-plugin-manager";

import { createDecorator } from "@/base/injection/injection";
import { isLocalPath } from "@/base/url";

import {
  ExtensionPreferenceService,
  IExtensionPreferenceService,
} from "./extension-preference-service";

export const IExtensionManagementService = createDecorator(
  "extensionManagementService"
);

export class ExtensionManagementService {
  private readonly _extManager: PluginManager;
  private readonly _extensionPreferenceService: ExtensionPreferenceService;

  private readonly _installedExtensions: { [key: string]: any };
  private readonly _installedExtensionInfos: {
    [key: string]: {
      id: string;
      name: string;
      version: string;
      author: string;
      verified: boolean;
      description: string;
      preference: { [key: string]: any };
      location: string;
      originLocation?: string;
    };
  };

  constructor(
    @IExtensionPreferenceService
    extensionPreferenceService: ExtensionPreferenceService
  ) {
    // TODO: log all for this service
    // TODO: different npm url for China
    this._extManager = new PluginManager({
      pluginsPath: globalThis["extensionWorkingDir"],
    });
    this._extensionPreferenceService = extensionPreferenceService;

    this._installedExtensions = {};
    this._installedExtensionInfos = {};
  }

  async installDefaultPlugins() {
    this.install(
      "/Users/administrator/Projects/extension_demos/paperlib-entry-scrape-extension"
    );
    this.install(
      "/Users/administrator/Projects/extension_demos/paperlib-metadata-scrape-extension"
    );
    this.install(
      "/Users/administrator/Projects/extension_demos/paperlib-paper-locate-extension"
    );
    this.install(
      "/Users/administrator/Projects/extension_demos/paperlib-preview-extension"
    );
  }

  async install(extensionName: string) {
    try {
      let info: IPluginInfo;
      let installFromFile = false;
      if (isLocalPath(extensionName)) {
        info = await this._extManager.installFromPath(extensionName, {
          force: false,
        });
        installFromFile = true;
      } else {
        info = await this._extManager.install(extensionName);
      }
      const extension = this._extManager.require(info.name);

      this._installedExtensions[info.name] = await extension.initialize();

      //TODO: verify extension
      // Can we use || here?
      this._installedExtensionInfos[info.name] = {
        id: this._installedExtensions[info.name].id,
        name: this._installedExtensions[info.name].name
          ? this._installedExtensions[info.name].name
          : info.name,
        version: info.version,
        author: this._installedExtensions[info.name].author
          ? this._installedExtensions[info.name].author
          : "community",
        verified: true,
        description: this._installedExtensions[info.name].description
          ? this._installedExtensions[info.name].description
          : "",
        preference:
          this._extensionPreferenceService.getAllMetadata(
            this._installedExtensions[info.name].id
          ) || {},
        location: info.location,
        originLocation: installFromFile ? extensionName : undefined,
      };

      PLAPI.logService.info(
        `Installed extension ${extensionName}`,
        "",
        false,
        "extensionManagementService"
      );
    } catch (e) {
      console.log(e);
      PLAPI.logService.error(
        `Failed to install extension ${extensionName}`,
        e as Error,
        true,
        "extensionManagementService"
      );
    }
  }

  async uninstall(extensionID: string) {
    try {
      if (
        this._installedExtensions[extensionID] &&
        this._installedExtensions[extensionID].dispose
      ) {
        await this._installedExtensions[extensionID].dispose();
      }
      delete this._installedExtensions[extensionID];
      delete this._installedExtensionInfos[extensionID];

      await this._extManager.uninstall(extensionID);

      PLAPI.logService.info(
        `Uninstalled extension ${extensionID}`,
        "",
        false,
        "extensionManagementService"
      );
    } catch (e) {
      console.error(e);
      PLAPI.logService.error(
        `Failed to uninstall extension ${extensionID}`,
        e as Error,
        true,
        "extensionManagementService"
      );
    }
  }

  async reload(extensionID: string) {
    try {
      const location =
        this._installedExtensionInfos[extensionID].originLocation ||
        this._installedExtensionInfos[extensionID].location;

      if (location !== this._installedExtensionInfos[extensionID].location) {
        // Installed from local file.
        await this.uninstall(extensionID);
        await this.install(location);
      } else {
        // Installed from other sources.
        fs.copyFileSync(location, location + ".bak");
        await this.uninstall(extensionID);
        fs.linkSync(location + ".bak", location);
        await this.install(location);
      }
    } catch (e) {
      console.error(e);
      PLAPI.logService.error(
        `Failed to reload extension ${extensionID}`,
        e as Error,
        true,
        "extensionManagementService"
      );
    }
  }

  async reloadAll() {
    for (const extensionID in this._installedExtensionInfos) {
      await this.reload(extensionID);
    }
  }

  installedExtensions() {
    return this._installedExtensionInfos;
  }

  async callExtensionMethod(
    extensionID: string,
    methodName: string,
    ...args: any
  ) {
    try {
      return await this._installedExtensions[extensionID][methodName](...args);
    } catch (e) {
      // TODO: check error obj transfer
      console.error(e);

      PLAPI.logService.error(
        `Failed to call extension method ${methodName} of extension ${extensionID}`,
        e as Error,
        true,
        "ExtensionManagementService"
      );
      throw e;
    }
  }
}
