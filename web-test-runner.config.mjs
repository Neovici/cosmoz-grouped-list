import {
	chromeLauncher, defaultReporter
} from '@web/test-runner';
import { seleniumLauncher } from '@web/test-runner-selenium';
import webdriver from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';

export default {
	nodeResolve: true,
	coverageConfig: {
		reportDir: 'coverage',
		threshold: {
			statements: 70,
			branches: 70,
			functions: 50,
			lines: 70
		}
	},
	testFramework: {
		config: {
			ui: 'tdd'
		}
	},
	files: [
		'**!(node_modules)/*.test.js'
	],
	browsers: [
		chromeLauncher(),
		seleniumLauncher({
			driverBuilder: new webdriver.Builder().forBrowser('firefox').setFirefoxOptions(new firefox.Options().headless())
		})
	]

};
