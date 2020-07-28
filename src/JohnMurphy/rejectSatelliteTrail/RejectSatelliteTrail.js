/* global PixelMath, Parameters, View, ImageWindow, Dialog, VERSION, TITLE, TextAlign_Right, TextAlign_VertCenter, StdIcon_Error, StdButton_Ok, StdButton_Cancel, Console, CoreApplication, FrameStyle_Box, StdIcon_Information, StdCursor_Checkmark, StdCursor_Crossmark */

// Version 1.0 (c) John Murphy 20th-Oct-2019
//
// ======== #license ===============================================================
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU General Public License as published by the
// Free Software Foundation, version 3 of the License.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for
// more details.
//
// You should have received a copy of the GNU General Public License along with
// this program.  If not, see <http://www.gnu.org/licenses/>.
// =================================================================================
"use strict";
#feature-id Preprocessing > RejectSatelliteTrail

#feature-info Forces pixel rejection by drawing a black line.<br/>\
Copyright &copy; 2020 John Murphy.<br/>

#include <pjsr/UndoFlag.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/StdCursor.jsh>
#include <pjsr/Sizer.jsh>
#include <pjsr/NumericControl.jsh>

#define VERSION  "1.0"
#define TITLE "RejectSatelliteTrail"
#define HORIZONTAL 0
#define VERTICAL 1

/**
 * Draw a black line through (x0,y0) to (x1,y1), with specified width
 * @param {RejectSatelliteTrailData} data
 * @param {View} view Supply Preview for real time update, MainView on execution
 * @param {Boolean} swapFile Set this to true for MainView
 * @param {Boolean} createDefectMap If true, a defect map image is created
 */
function drawBlackLine(data, view, swapFile, createDefectMap){
    if (view !== null && !view.isNull && 
            !(data.x0 === 0 && data.y0 ===0 && data.x1 === 0 && data.y1 === 0)){
            
        let distanceFromLine = data.lineWidth / 2;
        var P = new PixelMath;
        if (createDefectMap){
            P.createNewImage = true;
            P.showNewImage = true;
            P.newImageId = "DefectMap";
            P.expression = "iif (" +
                "d2line(" + data.x0 + ", " + data.y0 + ", " + data.x1 + ", " + data.y1 + ") < " + 
                distanceFromLine + ", 0, 1)";
        } else {
            P.expression = "iif (" +
                "d2line(" + data.x0 + ", " + data.y0 + ", " + data.x1 + ", " + data.y1 + ") < " + 
                distanceFromLine + ", 0, $T)";
        }
        P.truncate = false;
        P.executeOn(view, swapFile);
    }
}

/**
 * Reset the preview.
 * @param {View} preview The Preview to be reset
 */
function resetPreview(preview){
    if (preview !== null && !preview.isNull){
        // Is there a better way to reset the preview?
        var P = new PixelMath;
        P.expression = "$T";
        P.truncate = false;
        P.executeOn(preview, false);
    }
}

/**
 * If the preview exists, and there is valid line data, draw the black line.
 * If the preview exists, but there is no valid line data, reset the preview
 * Set the enabled state of the undoRedo, scrollToLineStart and scrollToLineEnd buttons.
 * @param {RejectSatelliteTrailData} data
 * @param {RejectSatelliteTrailDailog} dialog
 */
function updatePreview(data, dialog){
    
    function enable(enableFlag){
        dialog.undoRedoToggle_Button.enabled = enableFlag;
        dialog.scrollToLineStart_Button.enabled = enableFlag;
        dialog.scrollToLineEnd_Button.enabled = enableFlag;
    }
    
    if (data.preview === null || data.preview.isNull) {
        enable(false);
    } else if (data.x0 === 0 && data.y0 === 0 && data.x1 === 0 && data.y1 === 0) {
        resetPreview(data.preview);
        enable(false);
    } else {
        drawBlackLine(data, data.preview, false, false);
        enable(true);
    }
    // The only situation that the undo/redo button displays 'Redo' is
    // when the 'Undo' button is pressed. In all other situations it should 
    // display 'Undo' (but the button may be enabled or disabled).
    dialog.setUndo();
}

// -----------------------------------------------------------------------------
// Form/Dialog data
// -----------------------------------------------------------------------------
function RejectSatelliteTrailData() {
    // Used to populate the contents of a saved process icon
    this.saveParameters = function () {
        if (this.targetView !== null && !this.targetView.isNull) {
            Parameters.set("targetView", this.targetView.fullId);
        }
        Parameters.set("x0", this.x0);
        Parameters.set("y0", this.y0);
        Parameters.set("x1", this.x1);
        Parameters.set("y1", this.y1);
        Parameters.set("lineWidth", this.lineWidth);
    };

    // Reload our script's data from a process icon
    this.loadParameters = function () {
        if (Parameters.has("x0"))
            this.x0 = Parameters.getInteger("x0");
        if (Parameters.has("y0"))
            this.y0 = Parameters.getInteger("y0");
        if (Parameters.has("x1"))
            this.x1 = Parameters.getInteger("x1");
        if (Parameters.has("y1"))
            this.y1 = Parameters.getInteger("y1");
        if (Parameters.has("lineWidth"))
            this.lineWidth = Parameters.getReal("lineWidth");
    };

    // Initialise the scripts data
    this.setParameters = function () {
        this.x0 = 0;
        this.y0 = 0;
        this.x1 = 0;
        this.y1 = 0;
        this.lineWidth = 1;
    };

    // Used when the user presses the reset button
    this.resetParameters = function (rejectLineDialog) {
        this.setParameters();
        rejectLineDialog.startX_spinBox.value = this.x0;
        rejectLineDialog.startY_spinBox.value = this.y0;
        rejectLineDialog.endX_spinBox.value = this.x1;
        rejectLineDialog.endY_spinBox.value = this.y1;
        rejectLineDialog.lineWidth_Control.setValue(this.lineWidth);
        // This will reset the preview, set undo button to 'Undo', and disable
        // the 'Undo' and several other buttons
        updatePreview(this, rejectLineDialog);
    };

    // Initialise the script's data
    this.setParameters();
    
}

/**
 * Determine the line from two opposite corners of the preview and draw it.
 * @param {RejectSatelliteTrailDailog} dialog
 * @param {RejectSatelliteTrailData} data
 * @param {Boolean} topLeft_to_bottomRight
 */
function getLineFromPreview(dialog, data, topLeft_to_bottomRight){
    let view = dialog.previewImage_ViewList.currentView;
    if (view !== null && !view.isNull) {
        let previewRect = view.window.previewRect(view);
        data.x0 = previewRect.x0;
        data.x1 = previewRect.x1 - 1;
        if (topLeft_to_bottomRight){
            data.y0 = previewRect.y0;
            data.y1 = previewRect.y1 - 1;
        } else {
            // bottomLeft_to_topRight
            data.y0 = previewRect.y1 - 1;
            data.y1 = previewRect.y0;
        }
        dialog.startX_spinBox.value = data.x0;
        dialog.startY_spinBox.value = data.y0;
        dialog.endX_spinBox.value = data.x1;
        dialog.endY_spinBox.value = data.y1;

        // Draw the line and enable undo button
        updatePreview(data, dialog);
    }
}

// The main dialog function
function RejectSatelliteTrailDailog(data) {
    this.__base__ = Dialog;
    this.__base__();

    /**
     * @param {String} text
     * @returns {Label} label in FrameStyle_Box
     */
    function createTitleLabel(text){
        let titleLabel = new Label();
        titleLabel.frameStyle = FrameStyle_Box;
        titleLabel.margin = 4;
        titleLabel.wordWrapping = true;
        titleLabel.useRichText = true;
        titleLabel.text = text;
        return titleLabel;
    }

    function createGroupBox(dialog, title){
        let groupBox = new GroupBox(dialog);
        groupBox.title = title;
        groupBox.sizer = new VerticalSizer;
        groupBox.sizer.margin = 6;
        groupBox.sizer.spacing = 6;
        return groupBox;
    }


    let self = this;
    //-------------------------------------------------------
    // Create the Program Description at the top
    //-------------------------------------------------------
    let titleLabel = createTitleLabel("<b>" + TITLE + " v" + VERSION +
            "</b> &mdash; Replaces a satellite trail with a black line.<br />" +
            "(1) Create a preview. The satellite trail should run along the diagonal. Start script.<br />" +
            "(2) Use 'Top left to bottom right' or 'Bottom left to top right' to create the line.<br />" +
            "(3) Zoom in and scroll to line ends. Use the spin boxes to adjust the line.<br />" +
            "Copyright &copy; 2020 John Murphy.");

    let activeWindow = ImageWindow.activeWindow;
    if (!activeWindow.isNull) {
        data.targetView = activeWindow.mainView;
        if (Parameters.isViewTarget && 
                !(data.x0 === 0 && data.y0 === 0 && data.x1 === 0 && data.y1 === 0)){
            // Started from processInstance
            // Create or update the 'linePreview' preview to the stored line start and end points.
            // This is necessary because the the preview that existed when the process icon was created
            // might not still exist.
            let linePreview = activeWindow.previewById("linePreview");
            if (!linePreview.isNull){
                activeWindow.modifyPreview( linePreview, 
                        new Rect(data.x0, data.y0, data.x1, data.y1), "linePreview");
            } else {
                linePreview = activeWindow.createPreview(data.x0, data.y0, data.x1, data.y1, "linePreview");
            }
            data.preview = linePreview;
            activeWindow.currentView = data.preview;
        } else if (activeWindow.numberOfPreviews === 1) {
            // Only default the preview selection if there is only one preview.
            // If there are more than one, the user needs to decide.
            data.preview = activeWindow.previews[0];
            resetPreview(data.preview);
            activeWindow.currentView = data.preview;
        } else {
            data.preview = null;
        }
    } else {
        // There are no open windows. The user will only be able to open the help.
        data.targetView = null;
        data.preview = null;
    }

    //-------------------------------------------------------
    // Create the reference image field
    //-------------------------------------------------------
    let targetImage_Label = new Label(this);
    targetImage_Label.text = "Target view:";
    targetImage_Label.textAlignment = TextAlign_Right | TextAlign_VertCenter;
    targetImage_Label.toolTip = "<p>Draw black line into this image</p>";

    this.targetImage_ViewList = new ViewList(this);
    this.targetImage_ViewList.getMainViews();
    this.targetImage_ViewList.minWidth = 300;
    if (data.targetView !== null){
        this.targetImage_ViewList.currentView = data.targetView;
    }
    this.targetImage_ViewList.onViewSelected = function (view) {
        data.targetView = view;
        if (!data.targetView.isNull){
            view.window.bringToFront();
        }
    };

    let targetImage_Sizer = new HorizontalSizer;
    targetImage_Sizer.spacing = 4;
    targetImage_Sizer.add(targetImage_Label);
    targetImage_Sizer.add(this.targetImage_ViewList, 100);

    let previewImage_Label = new Label(this);
    previewImage_Label.text = "Preview:";
    previewImage_Label.minWidth = this.font.width("Target view:");
    previewImage_Label.textAlignment = TextAlign_Right | TextAlign_VertCenter;
    previewImage_Label.toolTip = "<p>The preview's diagonal is used to initialize the line.</p>" +
            "<p>The preview is also used to show live updates as line parameters are modified</p>";

    this.previewImage_ViewList = new ViewList(this);
    this.previewImage_ViewList.getPreviews();
    this.previewImage_ViewList.minWidth = 300;
    this.previewImage_ViewList.onViewSelected = function (preview) {
        if (preview.isNull){
            if (data.preview !== null){
                resetPreview(data.preview);
            }
            data.preview = null;
            enablePreviewSection(false);
        } else {
            enablePreviewSection(true);
            data.preview = preview;
            preview.window.bringToFront();
            preview.window.currentView = preview;
        }
        updatePreview(data, this.dialog);
    };
    if (data.preview !== null){
        this.previewImage_ViewList.currentView = data.preview;
    }
    
    let previewImage_Sizer = new HorizontalSizer;
    previewImage_Sizer.spacing = 4;
    previewImage_Sizer.add(previewImage_Label);
    previewImage_Sizer.add(this.previewImage_ViewList, 100);

    //-------------------------------------------------------
    // GroupBox: Line parameters
    //-------------------------------------------------------
    let lineGroupBox = createGroupBox(this, "Line Parameters");

    let previewDiagonal_Label = new Label(this);
    previewDiagonal_Label.text = "Line from preview:";
    previewDiagonal_Label.textAlignment = TextAlign_Right | TextAlign_VertCenter;
    
    let topLeft_to_bottomRight_Button = new PushButton();
    topLeft_to_bottomRight_Button.text = "Top left to bottom right";
    topLeft_to_bottomRight_Button.icon = new Bitmap(":/icons/border-diagonal1.png");
    topLeft_to_bottomRight_Button.toolTip =
            "The preview specifies a line from its top left corner to its bottom right corner.";
    topLeft_to_bottomRight_Button.onClick = function () {
        getLineFromPreview(this.dialog, data, true);
        startPoint_Label.text = "Top left";
        endPoint_Label.text = "Bottom right";
        self.scrollToLineStart_Button.text = "Scroll to top left";
        self.scrollToLineEnd_Button.text = "Scroll to bottom right";
    };

    let bottomLeft_to_topRight_Button = new PushButton(this);
    bottomLeft_to_topRight_Button.text = "Bottom left to top right";
    bottomLeft_to_topRight_Button.icon = new Bitmap(":/icons/border-diagonal2.png");
    bottomLeft_to_topRight_Button.toolTip =
            "The preview specifies a line from its bottom left corner to its top right corner.";
    bottomLeft_to_topRight_Button.onClick = function () {
        getLineFromPreview(this.dialog, data, false);
        startPoint_Label.text = "Bottom left";
        endPoint_Label.text = "Top right";
        self.scrollToLineStart_Button.text = "Scroll to bottom left";
        self.scrollToLineEnd_Button.text = "Scroll to top right";
    };

    let button_Sizer = new HorizontalSizer;
    button_Sizer.spacing = 4;
    button_Sizer.add(previewDiagonal_Label);
    button_Sizer.add(topLeft_to_bottomRight_Button);
    button_Sizer.add(bottomLeft_to_topRight_Button);
    button_Sizer.addStretch();

    let startLabelWidth = this.font.width("Bottom right") + 10;
    let startPoint_Label = new Label(this);
    startPoint_Label.text = "Start point";
    startPoint_Label.minWidth = startLabelWidth;
    startPoint_Label.textAlignment = TextAlign_Right | TextAlign_VertCenter;
    
    let startPointX_Label = new Label(this);
    startPointX_Label.text = "x:";
    startPointX_Label.textAlignment = TextAlign_Right | TextAlign_VertCenter;

    this.startX_spinBox = new SpinBox(this);
    this.startX_spinBox.setRange(0, 10000);
    this.startX_spinBox.editable = true;
    this.startX_spinBox.minWidth = 100;
    this.startX_spinBox.autoAdjustWidth = false;
    this.startX_spinBox.value = data.x0;
    this.startX_spinBox.onValueUpdated = function( value ){
        data.x0 = value;
        updatePreview(data, self.dialog);
    };
    
    let startPointY_Label = new Label(this);
    startPointY_Label.text = "y:";
    startPointY_Label.textAlignment = TextAlign_Right | TextAlign_VertCenter;
    
    this.startY_spinBox = new SpinBox(this);
    this.startY_spinBox.setRange(0, 10000);
    this.startY_spinBox.editable = true;
    this.startY_spinBox.minWidth = 100;
    this.startY_spinBox.autoAdjustWidth = false;
    this.startY_spinBox.value = data.y0;
    this.startY_spinBox.onValueUpdated = function( value ){
        data.y0 = value;
        updatePreview(data, self.dialog);
    };
    
    let start_Sizer = new HorizontalSizer;
    start_Sizer.spacing = 4;
    start_Sizer.add(startPoint_Label);
    start_Sizer.addSpacing(10);
    start_Sizer.add(startPointX_Label);
    start_Sizer.add(this.startX_spinBox);
    start_Sizer.addSpacing(15);
    start_Sizer.add(startPointY_Label);
    start_Sizer.add(this.startY_spinBox);
    start_Sizer.addStretch();

    let endPoint_Label = new Label(this);
    endPoint_Label.text = "End point";
    endPoint_Label.minWidth = startLabelWidth;
    endPoint_Label.textAlignment = TextAlign_Right | TextAlign_VertCenter;
    
    let endPointX_Label = new Label(this);
    endPointX_Label.text = "x:";
    endPointX_Label.textAlignment = TextAlign_Right | TextAlign_VertCenter;

    this.endX_spinBox = new SpinBox(this);
    this.endX_spinBox.setRange(0, 10000);
    this.endX_spinBox.editable = true;
    this.endX_spinBox.minWidth = 100;
    this.endX_spinBox.autoAdjustWidth = false;
    this.endX_spinBox.value = data.x1;
    this.endX_spinBox.onValueUpdated = function( value ){
        data.x1 = value;
        updatePreview(data, self.dialog);
    };
    
    let endPointY_Label = new Label(this);
    endPointY_Label.text = "y:";
    endPointY_Label.textAlignment = TextAlign_Right | TextAlign_VertCenter;
    
    this.endY_spinBox = new SpinBox(this);
    this.endY_spinBox.setRange(0, 10000);
    this.endY_spinBox.editable = true;
    this.endY_spinBox.minWidth = 100;
    this.endY_spinBox.autoAdjustWidth = false;
    this.endY_spinBox.value = data.y1;
    this.endY_spinBox.onValueUpdated = function( value ){
        data.y1 = value;
        updatePreview(data, self.dialog);
    };
    
    function undo(){
        resetPreview(data.preview);
        self.undoRedoToggle_Button.onClick = redo;
        self.undoRedoToggle_Button.icon = new Bitmap(":/toolbar/preview-redo.png");
        self.undoRedoToggle_Button.text = "Redo";
        self.undoRedoToggle_Button.toolTip = "Redo preview";
    }
    function redo(){
        updatePreview(data, this.dialog);
        self.setUndo();
    }
    
    this.setUndo = function(){
        self.undoRedoToggle_Button.onClick = undo;
        self.undoRedoToggle_Button.icon = new Bitmap(":/toolbar/preview-undo.png");
        self.undoRedoToggle_Button.text = "Undo";
        self.undoRedoToggle_Button.toolTip = "Undo preview";
    };
    
    this.undoRedoToggle_Button = new PushButton();
    this.setUndo();
    
    let end_Sizer = new HorizontalSizer;
    end_Sizer.spacing = 4;
    end_Sizer.add(endPoint_Label);
    end_Sizer.addSpacing(10);
    end_Sizer.add(endPointX_Label);
    end_Sizer.add(this.endX_spinBox);
    end_Sizer.addSpacing(15);
    end_Sizer.add(endPointY_Label);
    end_Sizer.add(this.endY_spinBox);
    end_Sizer.addStretch();
    end_Sizer.add(this.undoRedoToggle_Button);

    this.lineWidth_Control = new NumericControl(this);
    this.lineWidth_Control.real = true;
    this.lineWidth_Control.label.text = "Line width:";
    this.lineWidth_Control.label.minWidth = this.font.width("Line width:");
    this.lineWidth_Control.toolTip = "<p>Line width in pixels</p>";
    this.lineWidth_Control.onValueUpdated = function (value) {
        data.lineWidth = value;
        updatePreview(data, self.dialog);
    };
    this.lineWidth_Control.setRange(1, 30);
    this.lineWidth_Control.setPrecision = 1;
    this.lineWidth_Control.slider.setRange(10, 300);
    this.lineWidth_Control.slider.minWidth = 300;
    this.lineWidth_Control.setValue(data.lineWidth);
    
    lineGroupBox.sizer.add(button_Sizer);
    lineGroupBox.sizer.add(start_Sizer);
    lineGroupBox.sizer.add(end_Sizer);
    lineGroupBox.sizer.add(this.lineWidth_Control);

    //-------------------------------------------------------
    // GroupBox: Preview
    //-------------------------------------------------------
    let previewGroupBox = createGroupBox(this, "Scroll and Zoom");
    
    let zoomIn_Button = new PushButton();
//    zoomIn_Button.text = "Zoom in";
    zoomIn_Button.icon = new Bitmap(":/icons/zoom-in.png");
    zoomIn_Button.toolTip = "<p>Zoom preview.</p>" +
            "<p>Short cut: mouse wheel (mouse cursor must be within the dialog)</p>";
    zoomIn_Button.onClick = function () {
        zoomIn();
    };

    let zoomOut_Button = new PushButton(this);
//    zoomOut_Button.text = "Zoom out";
    zoomOut_Button.icon = new Bitmap(":/icons/zoom-out.png");
    zoomOut_Button.toolTip = "<p>Zoom preview.</p>" +
            "<p>Short cut: mouse wheel (mouse cursor must be within the dialog)</p>";
    zoomOut_Button.onClick = function () {
        zoomOut();
    };
    
    /**
     * Zoom or scroll the preview
     * @param {Number} x
     * @param {Number} y
     * @param {Number} delta Mouse wheel delta
     * @param {Number} buttonState
     * @param {Number} modifiers None:Zoom, Shift:up/down, Ctrl:left/right
     */
    this.onMouseWheel = function ( x, y, delta, buttonState, modifiers ){
        if (modifiers === 0){
            delta < 1 ? zoomIn() : zoomOut();
        } else {
            let pageFraction = delta > 0 ? -0.5 : 0.5;
            if (modifiers === 1){
                verticalScroll(pageFraction);
            } else if (modifiers === 2){
                horizontalScroll(pageFraction);
            }
        }
    };
    
    /**
     * Preview zoom in
     */
    function zoomIn(){
        if (data.preview !== null  && !data.preview.isNull){
            data.preview.window.zoomFactor += 1;
        }
    }
    
    /**
     * Preview zoom out
     */
    function zoomOut(){
        if (data.preview !== null  && !data.preview.isNull){
            let zoomFactor = data.preview.window.zoomFactor - 1;
            if (zoomFactor === 0){
                zoomFactor = -2;
            }
            data.preview.window.zoomFactor = zoomFactor;
        }
    }
    
    /**
     * Scrolls the preview left or right
     * @param {Number} pageFraction Scroll distance as a fraction of the viewport.
     * Negative value scrolls left
     */
    function horizontalScroll(pageFraction){
        if (data.preview !== null && !data.preview.isNull){
            let p = data.preview.window.viewportPosition;
            let d = data.preview.window.visibleViewportRect.width * pageFraction;
            data.preview.window.viewportPosition = new Point(p.x + d, p.y);
        }
    }
    
    /**
     * Scrolls the preview up or down
     * @param {Number} pageFraction Scroll distance as a fraction of the viewport.
     * Negative value scrolls up
     */
    function verticalScroll(pageFraction){
        if (data.preview !== null && !data.preview.isNull){
            let p = data.preview.window.viewportPosition;
            let d = data.preview.window.visibleViewportRect.height * pageFraction;
            data.preview.window.viewportPosition = new Point(p.x, p.y + d);
        }
    }
    
    let scrollLeft_Button = new PushButton(this);
//    scrollLeft_Button.text = "Left";
    scrollLeft_Button.icon = new Bitmap(":/icons/arrow-left.png");
    scrollLeft_Button.toolTip = "<p>Scroll preview left</p>" +
            "<p>Short cut: Ctrl + mouse wheel (mouse cursor must be within the dialog)</p>";
    scrollLeft_Button.onClick = function () {
        horizontalScroll(-0.5);
    };
    
    let scrollRight_Button = new PushButton(this);
//    scrollRight_Button.text = "Right";
    scrollRight_Button.icon = new Bitmap(":/icons/arrow-right.png");
    scrollRight_Button.toolTip = "<p>Scroll preview right</p>" +
            "<p>Short cut: Ctrl + mouse wheel (mouse cursor must be within the dialog)</p>";
    scrollRight_Button.onClick = function () {
        horizontalScroll(0.5);
    };
    
    let scrollUp_Button = new PushButton(this);
//    scrollUp_Button.text = "Up";
    scrollUp_Button.icon = new Bitmap(":/icons/arrow-up.png");
    scrollUp_Button.toolTip = "<p>Scroll preview up</p>" +
            "<p>Short cut: Shift + mouse wheel (mouse cursor must be within the dialog)</p>";
    scrollUp_Button.onClick = function () {
        verticalScroll(-0.5);
    };
    
    let scrollDown_Button = new PushButton(this);
//    scrollDown_Button.text = "Down";
    scrollDown_Button.icon = new Bitmap(":/icons/arrow-down.png");
    scrollDown_Button.toolTip = "<p>Scroll preview down</p>" +
            "<p>Short cut: Shift + mouse wheel (mouse cursor must be within the dialog)</p>";
    scrollDown_Button.onClick = function () {
        verticalScroll(0.5);
    };
    
    this.scrollToLineStart_Button = new PushButton(this);
    this.scrollToLineStart_Button.text = "Scroll to line start";
    this.scrollToLineStart_Button.icon = new Bitmap(":/icons/arrow-left-limit.png");
    this.scrollToLineStart_Button.toolTip = "Scroll preview to start of line";
    this.scrollToLineStart_Button.onClick = function () {
        zoomToStart();
    };
    
    this.scrollToLineEnd_Button = new PushButton(this);
    this.scrollToLineEnd_Button.text = "Scroll to line end ";
    this.scrollToLineEnd_Button.icon = new Bitmap(":/icons/arrow-right-limit.png");
    this.scrollToLineEnd_Button.toolTip = "Scroll preview to end of line";
    this.scrollToLineEnd_Button.onClick = function () {
        zoomToEnd();
    };
    
    function zoomToStart(){
        if (data.preview !== null && !data.preview.isNull){
            let zoomFactor = data.preview.window.zoomFactor;
            let previewRect = data.preview.window.previewRect(data.preview);
            let pageWidth = data.preview.window.visibleViewportRect.width;
            let pageHeight = data.preview.window.visibleViewportRect.height;
            let x = (data.x0 - previewRect.x0) * zoomFactor;
            let y = (data.y0 - previewRect.y0) * zoomFactor;
            if (data.x0 > data.x1) x -= pageWidth;
            if (data.y0 > data.y1) y -= pageHeight;
            data.preview.window.viewportPosition = new Point(x, y);
        }
    }
    
    function zoomToEnd(){
        if (data.preview !== null && !data.preview.isNull){
            let zoomFactor = data.preview.window.zoomFactor;
            let previewRect = data.preview.window.previewRect(data.preview);
            let pageWidth = data.preview.window.visibleViewportRect.width;
            let pageHeight = data.preview.window.visibleViewportRect.height;
            let x = (data.x1 - previewRect.x0) * zoomFactor;
            let y = (data.y1 - previewRect.y0) * zoomFactor;
            if (data.x1 > data.x0) x -= pageWidth;
            if (data.y1 > data.y0) y -= pageHeight;
            data.preview.window.viewportPosition = new Point(x, y);
        }
    }
    
    let buttonRow1_Sizer = new HorizontalSizer;
    buttonRow1_Sizer.spacing = 4;
    buttonRow1_Sizer.add(zoomIn_Button);
    buttonRow1_Sizer.add(zoomOut_Button);
    buttonRow1_Sizer.add(scrollUp_Button);
    buttonRow1_Sizer.add(this.scrollToLineStart_Button);
    buttonRow1_Sizer.addStretch();
    
    let buttonRow2_Sizer = new HorizontalSizer;
    buttonRow2_Sizer.spacing = 4;
    buttonRow2_Sizer.add(scrollLeft_Button);
    buttonRow2_Sizer.add(scrollRight_Button);
    buttonRow2_Sizer.add(scrollDown_Button);
    buttonRow2_Sizer.add(this.scrollToLineEnd_Button);
    buttonRow2_Sizer.addStretch();
    
    previewGroupBox.sizer.add(buttonRow1_Sizer);
    previewGroupBox.sizer.add(buttonRow2_Sizer);
    
    function enablePreviewSection(enable){
        topLeft_to_bottomRight_Button.enabled = enable;
        bottomLeft_to_topRight_Button.enabled = enable;
        zoomIn_Button.enabled = enable;
        zoomOut_Button.enabled = enable;
        scrollLeft_Button.enabled = enable;
        scrollRight_Button.enabled = enable;
        scrollUp_Button.enabled = enable;
        scrollDown_Button.enabled = enable;
        if (!enable){
            // Only disable these buttons. They get enabled after any edit.
            self.undoRedoToggle_Button.enabled = false;
            self.scrollToLineStart_Button.enabled = true;
            self.scrollToLineEnd_Button.enabled = true;
        }
    }
    
    enablePreviewSection(data.preview !== null);

    //-------------------------------------------------------
    // ProcessIcon, Help, reset, OK, Cancel buttons
    //-------------------------------------------------------
    const helpWindowTitle = TITLE + " v" + VERSION;
    const HELP_MSG =
            "<p>To install this script, use 'SCRIPT \> Feature Scripts...' and then in the " +
            "'Feature Scripts' dialog box, press the 'Add' button and select the folder " +
            "where you unzipped this script.</p>" +
            "<p>To install the help files, unzip 'RejectSatelliteTrailHelp.zip' to " +
            "'[PixInsight]/doc/scripts/'</p>" +
            "<p>For example, on Windows, the correct installation would include:</p>" +
            "<p>C:/Program Files/PixInsight/doc/scripts/RejectSatelliteTrail/RejectSatelliteTrail.html</p>" +
            "<p>C:/Program Files/PixInsight/doc/scripts/RejectSatelliteTrail/images/</p>";

    //-------------------------------------------------------
    // Control buttons
    //-------------------------------------------------------
    let scriptName = "RejectSatelliteTrail";
    let newInstanceIcon = this.dialog.scaledResource(":/process-interface/new-instance.png");

    let defectMap_Button = new PushButton();
    defectMap_Button.text = "Create defect map";
    defectMap_Button.onClick = function () {
        // Calculate and apply the line
        drawBlackLine(data, data.targetView, true, true);
    };

    let ok_Button = new PushButton();
    ok_Button.text = "OK";
    ok_Button.cursor = new Cursor(StdCursor_Checkmark);
    ok_Button.onClick = function () {
        self.dialog.ok();
    };

    let cancel_Button = new PushButton();
    cancel_Button.text = "Cancel";
    cancel_Button.cursor = new Cursor(StdCursor_Crossmark);
    cancel_Button.onClick = function () {
        self.dialog.cancel();
    };

    let buttons_Sizer = new HorizontalSizer;
    buttons_Sizer.spacing = 6;

    // New Instance button
    let newInstance_Button = new ToolButton();
    newInstance_Button.icon = newInstanceIcon;
    newInstance_Button.setScaledFixedSize(24, 24);
    newInstance_Button.toolTip = "Save as Process Icon";
    newInstance_Button.onMousePress = function () {
        this.hasFocus = true;
        this.pushed = false;
        data.saveParameters();
        self.dialog.newInstance();
    };

    let browseDocumentationButton = new ToolButton();
    browseDocumentationButton.icon = ":/process-interface/browse-documentation.png";
    browseDocumentationButton.toolTip =
            "<p>Opens a browser to view the script's documentation.</p>";
    browseDocumentationButton.onClick = function () {
        if (scriptName !== undefined && scriptName !== null) {
            let ok = Dialog.browseScriptDocumentation(scriptName);
            if (ok)
                return;
        }
        (new MessageBox(
                HELP_MSG,
                helpWindowTitle,
                StdIcon_Information,
                StdButton_Ok
                )).execute();
    };

    buttons_Sizer.add(newInstance_Button);
    buttons_Sizer.add(browseDocumentationButton);

    let resetButton = new ToolButton();

    resetButton.icon = ":/images/icons/reset.png";
    resetButton.toolTip = "<p>Resets the dialog's parameters.";
    resetButton.onClick = function () {
        data.resetParameters(this.dialog);
    };

    buttons_Sizer.add(resetButton);
    buttons_Sizer.addStretch();
    buttons_Sizer.add(defectMap_Button);
    buttons_Sizer.add(ok_Button);
    buttons_Sizer.add(cancel_Button);

    //-------------------------------------------------------
    // Vertically stack all the objects
    //-------------------------------------------------------
    this.sizer = new VerticalSizer;
    this.sizer.margin = 6;
    this.sizer.spacing = 6;
    this.sizer.add(titleLabel);
    this.sizer.add(targetImage_Sizer);
    this.sizer.add(previewImage_Sizer);
    this.sizer.add(lineGroupBox);
    this.sizer.add(previewGroupBox);
    this.sizer.add(buttons_Sizer);

    //-------------------------------------------------------
    // Set all the window data
    //-------------------------------------------------------
    this.windowTitle = TITLE;
    this.adjustToContents();
    this.setFixedSize();
    
    updatePreview(data, this.dialog);
}

// Our dialog inherits all properties and methods from the core Dialog object.
RejectSatelliteTrailDailog.prototype = new Dialog;

// Mosaic Linear Fit main process
function main() {
    const MAJOR = 1;
    const MINOR = 8;
    const RELEASE = 8;
    const REVISION = 4;
    
    function isVersionOk(major, minor, release, revision){
        if (CoreApplication.versionMajor > major)
            return true;
        if (CoreApplication.versionMajor < major)
            return false;
        if (CoreApplication.versionMinor > minor)
            return true;
        if (CoreApplication.versionMinor < minor)
            return false;
        if (CoreApplication.versionRelease > release)
            return true;
        if (CoreApplication.versionRelease < release)
            return false;

        return (CoreApplication.versionRevision >= revision);
    }

    function displayVersionWarning(major, minor, release, revision){
        Console.criticalln("PixInsight version:  ", 
            CoreApplication.versionMajor, ".", CoreApplication.versionMinor,
            ".", CoreApplication.versionRelease, "-", CoreApplication.versionRevision);
        Console.criticalln("Minimum requirement: ", major, ".", minor, ".", release, "-", revision);
    }
    
    if (!isVersionOk(MAJOR, MINOR, RELEASE, REVISION)){
        displayVersionWarning(MAJOR, MINOR, RELEASE, REVISION);
    }
    
    // Create dialog, start looping
    let data = new RejectSatelliteTrailData();

    if (Parameters.isGlobalTarget){
        (new MessageBox("Error: Unable to run in global context", TITLE, StdIcon_Error, StdButton_Ok)).execute();
        return;
    }

    if (Parameters.isViewTarget) {
        data.loadParameters();
    }

    let rejectLineDialog = new RejectSatelliteTrailDailog(data);
    console.writeln("=================================================");
    console.writeln("<b>", TITLE, " ", VERSION, "</b>:");
    console.hide();
    for (; ; ) {
        if (!rejectLineDialog.execute())
            break;

        if (data.targetView === null || data.targetView.isNull) {
            (new MessageBox("Error: Target view must be selected", TITLE, StdIcon_Error, StdButton_Ok)).execute();
            continue;
        }
        
        if (data.preview !== null && !data.preview.isNull &&
                data.preview.window.mainView.fullId !== data.targetView.fullId){
            let msgBox = new MessageBox("WARNING: The preview is not from the target image", 
                    TITLE, StdIcon_Error, StdButton_Ok, StdButton_Cancel);
            if (msgBox.execute() === StdButton_Cancel){
                continue;
            } 
        }

        // Calculate and apply the line
        drawBlackLine(data, data.targetView, true, false);

    }

    return;
}

main();
