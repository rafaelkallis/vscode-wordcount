// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import {window, workspace, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument} from 'vscode';
import { relative } from 'path';
import {degreeOfAuthorship} from 'degree-of-authorship';

// this method is called when your extension is activated. activation is
// controlled by the activation events defined in package.json
export function activate(ctx: ExtensionContext) {
    // create a expertise finder
    const expertiseFinder = new ExpertiseFinder();
    const controller = new ExpertiseFinderController(expertiseFinder);

    // add to a list of disposables which are disposed when this extension
    // is deactivated again.
    ctx.subscriptions.push(controller);
    ctx.subscriptions.push(expertiseFinder);
}

export class ExpertiseFinder {
    private _statusBarItem: StatusBarItem;
    
    public updateExpert() {
        if (!this._statusBarItem) {
            this._statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
        } 

        // Get the current text editor
        let editor = window.activeTextEditor;
        if (!editor) {
            this._statusBarItem.hide();
            return;
        }

        const workingDir = (workspace as any).workspaceFolders[0].uri.path;
        const filePath = relative(workingDir, window.activeTextEditor.document.fileName);
        this._getExpert(workingDir, filePath).then(expert => {
            // Update the status bar
            this._statusBarItem.text = `$(person) ${expert}`;
            this._statusBarItem.show();    
        });
    }

    private async _getExpert(workingDir: string, filePath: string) {
        const doaMap = await degreeOfAuthorship(workingDir, filePath);
        let [expert] = Object.keys(doaMap);
        for (const author of Object.keys(doaMap)) {
            if (doaMap[author] > doaMap[expert]) {
                expert = author;
            }
        }
        return expert;            
    }

    public dispose() {
        this._statusBarItem.dispose();
    }
}

class ExpertiseFinderController {

    private _expertiseFinder: ExpertiseFinder;
    private _disposable: Disposable;

    constructor(expertiseFinder: ExpertiseFinder) {
        this._expertiseFinder = expertiseFinder;
        this._expertiseFinder.updateExpert();

        // subscribe to selection change and editor activation events
        let subscriptions: Disposable[] = [];
        window.onDidChangeActiveTextEditor(this._onEvent, this, subscriptions);

        // create a combined disposable from both event subscriptions
        this._disposable = Disposable.from(...subscriptions);
    }

    private _onEvent() {
        this._expertiseFinder.updateExpert();
    }

    public dispose() {
        this._disposable.dispose();
    }
}