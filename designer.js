//functions in this file


//defineResourceType: this function will be invoked from the "Create new Resource(s)" process flow in the GUI. 
//takes colour (which will be automatically assigned), setupTimeConfig which is a description of the distribution and its parameters for the setup time
// and number of resources (1-5) as inputs

//designerInitiate: this function creates a grid which can be interacted with to define the process flowchart
//takes the following inputs:
//x= number of raw materials (min: 1, max: 10)
//y= number of end products (min: 1, max: 10)
//z= number of rows in the process flow (min: 1, max 10)

designGridObjs=[];
definedFlag=[];

//for resources
var xCoord2=200;
var yCoord2=50;

//for process
var xCoord1=600;
var yCoord1=50;

var resourceColourList=["blue",	"red", "cyan", "pink", "brown", "green", "grey"];

//resource code
var currResourceTypeCount=0;
defineResourceType = function (setupTimeConfig, numResources) {
	if(currResourceTypeCount==0) {
		var temp3= new Konva.Text({
		x: xCoord2-50,
	    y: yCoord2-30,
	    text:'Setup',
	    fontSize: 15,
	    fontFamily: 'Arial',
	    width: 50,
	    //padding: 20,
	    align: 'left'
	});
	layer.add(temp3);
	stage.add(layer);
	}
	//creates new resource type
	if(currResourceTypeCount==7) { alert("can't create more than 7 types of resources!"); return;}
	tentativeResourceList.push({
		type:currResourceTypeCount,
		colour:resourceColourList[currResourceTypeCount],
		setupTimeConfig:setupTimeConfig,
		num:numResources
	});
	var opt = document.createElement('option');
    		opt.value = currResourceTypeCount;
    		opt.innerHTML = resourceColourList[currResourceTypeCount];
			resourcesSelect.appendChild(opt);
	if(setupTimeConfig.code==0) var timeDisplay=setupTimeConfig.time;
	else var timeDisplay=setupTimeConfig.mean;
	currResourceTypeCount+=1; //increment counter
	var temp2= new Konva.Text({
		x: xCoord2-50,
	    y: yCoord2+17.5+100*(currResourceTypeCount-1),
	    text:""+timeDisplay,
	    fontSize: 15,
	    fontFamily: 'Arial',
	    width: 50,
	    //padding: 20,
	    align: 'left'
	});
	layer.add(temp2);
	stage.add(layer);

	for (var i=0;i<numResources;i++) {
		var temp= new Resource({
			x:xCoord2+60*i,
			y:yCoord2+100*(currResourceTypeCount-1),
			colour:resourceColourList[currResourceTypeCount-1], 
			stroke:'black',
			setupTime:setupTimeConfig, 
			id: ''+currResourceTypeCount+'-'+i
		});
	}
}
row=0;
col=0;
//process code
designerInitiate = function (x,y,z) {
	//x= number of raw materials (min: 1, max: 10)
	//y= number of end products (min: 1, max: 10)
	//z= number of rows in the process flow (min: 1, max 10)
	col= Math.max(x,y);
	row=z;
	var height,y;
	for (var i=0;i<col;i++) {
		designGridObjs.push(new Array());
		definedFlag.push(new Array());
		tentativeGraph.push(new Array());
		for (var j=0;j<row+2; j++) {
			//Node: type,createdUnits,setupConfig,procConfig,children, isDummy,isDemand
			tentativeGraph[i].push(new Node(0,0,0,0,[],true,false));
			definedFlag[i].push(0);
			if(j==0||j==row+1){height=30;} else {height=50;}
            if(j==1){y=30;} else if(j==0){y=0;} else {y=30+50*(j-1);}
			designGridObjs[i].push(new Konva.Rect({
                x: xCoord1+80*i,
                y: yCoord1+y,
                width: 80,
                height: height,
                fill: 'white',
                stroke: 'black',
                strokeWidth: 2,
                id: 'grid-'+i+'-'+j
            }));
            layer.add(designGridObjs[i][j]);
            stage.add(layer);
            if(j==0){
            
                // designGridObjs[i][j].on('mouseup', function(){
                //     demandTrigger2(this.id());
                // })  ;
            } else if (j==row+1) {
            	
                // designGridObjs[i][j].on('mouseup', function(){
                //     rmTrigger2(this.id());
                // })  ;
            } else {
            	
                // designGridObjs[i][j].on('mouseup', function(){
                //     wsTrigger2(this.id());
                // })  ;
            }
		}
	}
	stage.on('click', function(){
		 var position=stage.getPointerPosition();
		 var yy=0,xx=0;
		 if(position.x>xCoord1&& position.y>yCoord1){
		 	if(position.y<yCoord1+30){ yy = 0;}
		 	else { yy=1+Math.trunc(((position.y-yCoord1-30)/50)/1);}
			xx=Math.trunc(((position.x-xCoord1)/80)/1);
			console.log(xx,yy);
			if(yy>0&&yy<row+1&&xx<col){
				//user has clicked on a workstation
				wsTrigger2(xx,yy);
			} else if (yy==row+1 && xx<col){
				//user has clicked on an rm
				rmTrigger2(xx,yy);
			} else if (yy==0 && xx<col){
				demandTrigger2(xx,yy);
			}
		}
	});
}
//tooltips
//explain the user what they're adding in the grid:


//define interactivity with the grid:

//wsTrigger

wsAddEnable=0;
rmAddEnable=0;
demandAddEnable=0;
wsConnectEnable=0;
oneWSselectedFlag=0;
connectX1=0;
connectY1=0;
connectX2=0;
connectY2=0;

//save info here
tentativeResourceList= [];
tentativeGraph= [];
currWSx=0;
currWSy=0;
wsTrigger2 = function(x,y) {
	if(wsAddEnable==0&&wsConnectEnable==0) { return; }

	
	if(wsConnectEnable==1) {
		if(definedFlag[x][y]==0){return;}
		if(oneWSselectedFlag==0) { 
			oneWSselectedFlag=1;
			connectX1=x;
			connectY1=y;
			console.log("connect 1 coords:"+x+","+y);
			return;
		}
		if(oneWSselectedFlag==1) {
			oneWSselectedFlag=0;
			connectX2=x;
			connectY2=y;
			if(connectY2>connectY1) {return;}
			console.log("connect 2 coords:"+x+","+y);
			connectWorkstations(connectX1,connectY1,connectX2,connectY2);
			return;
		}
	}
	if(definedFlag[x][y]==1) { return; }
	currWSx=x;
	currWSy=y;
	promptForWSInput();

}

promptForWSInput = function () {
	addWorkstationModal.style.display = "block";
	document.getElementById("ws-buffer2").value=0;
}

addWorkstation = function (x,y,type,procConfig,buffervalue) {
	definedFlag[x][y]=1;
	var yy;
	if(y==1){yy=30;} else if(y==0){yy=0;} else {yy=30+50*(y-1);}
	var t1= new WS(xCoord1+80*x+40,yy+85,tentativeResourceList[type].colour,0,0,0,x,y,[],[]);
	t1.insertWS();
	if(procConfig.code==0) t1.updateWSText(procConfig.time);
	else t1.updateWSText(procConfig.mean);
	var t2= new Buffer(xCoord1+80*x+20,yy+50,x,y,[],[]);
	t2.insertBuffer();
	tentativeGraph[x][row+1-y].isDummy=false;
	tentativeGraph[x][row+1-y].type=type;
	tentativeGraph[x][row+1-y].units=""+buffervalue;
	tentativeGraph[x][row+1-y].displayProcTime=""+getDisplayTime(procConfig);
	if(y==0) tentativeGraph[x][row+1-y].isDemand=true;
	if(definedFlag[x][y+1]==1){tentativeGraph[x][row+1-y].childNodes.push([x,row+1-y-1]);}
	if(definedFlag[x][y-1]==1){tentativeGraph[x][row+1-y+1].childNodes.push([x,row+1-y]);}
	tentativeGraph[x][row+1-y].procConfig=procConfig;
	tentativeGraph[x][row+1-y].setupConfig=tentativeResourceList[type].setupTimeConfig;
	tentativeGraph[x][row+1-y].breakdown=false;
	tentativeGraph[x][row+1-y].timeSinceRepair=0;
	tentativeGraph[x][row+1-y].numBreakdowns=0;
	console.log(tentativeGraph[x][row+1-y])
}
tentativeArrowList=[];
connectWorkstations = function (x1,y1,x2,y2) {
	//connects workstations at x1,y1 and x2,y2
	var yy1,yy2;
	if(y1==1){yy1=80;} else if(y1==0){yy1=30;} else {yy1=80+50*(y1-1);}
	if(y2==1){yy2=80;} else if(y2==0){yy2=30;} else {yy2=80+50*(y2-1);}
	var x1p=xCoord1+80*x1+40;
	var x2p=xCoord1+80*x2+40;
	var t;
	if(x1>x2 ) {
		t=new Arrow(x1p,yy1,x2p+20,yy2+35);
		tentativeArrowList.push([x1p,yy1,x2p+20,yy2+35]);
	}	else if(x1<x2) {
		t=new Arrow(x1p,yy1,x2p-20,yy2+35);
		tentativeArrowList.push([x1p,yy1,x2p-20,yy2+35]);
	}	else {
		t=new Arrow(x1p,yy1,x2p,yy2+50);
		tentativeArrowList.push([x1p,yy1,x2p,yy2+50]);
	}
	t.insertArrow();
	tentativeGraph[x2][row+1-y2].childNodes.push([x1,row+1-y1]);

	console.log(tentativeGraph[x2][row+1-y2]);
}

currRMx=0;
currRMy=0;
rmTrigger2 = function (x,y) {
	if(rmAddEnable==0&&wsConnectEnable==0) { return; }
	if(rmAddEnable==1) {
		if(definedFlag[x][y]==1) { return; }
		currRMx=x;
		currRMy=y;
		promptForRMInput();
		return;
	}
	if(wsConnectEnable==1){
		if(definedFlag[x][y]==0){return;}
		if(oneWSselectedFlag==1){return;}
		oneWSselectedFlag=1;
		connectX1=x;
		connectY1=y;
		console.log("connect 1 coords:"+x+","+y);
		return;
	}
}

promptForRMInput = function () {
	addRMModal.style.display = "block";
}

addRawMaterialNode = function(x,y,props) {
	//props: cost: cost per unit of the raw material
	definedFlag[x][y]=1;
	var yy;
	if(y==1){yy=30;} else if(y==0){yy=0;} else {yy=30+50*(y-1);}
	var t1= new RM(xCoord1+80*x+40,yy+65);
	t1.insertRM();
	t1.updateRMText("0");
	tentativeGraph[x][row+1-y].isDummy=false;
	tentativeGraph[x][row+1-y].cost=props.cost;
	if(definedFlag[x][y+1]==1){tentativeGraph[x][row+1-y].childNodes.push([x,row+1-y-1]);}
	if(definedFlag[x][y-1]==1){tentativeGraph[x][row+1-y+1].childNodes.push([x,row+1-y]);}
	console.log(tentativeGraph[x][row+1-y])
}


currDx=0;
currDy=0;

demandTrigger2 = function (x,y) {
	if(demandAddEnable==0&&wsConnectEnable==0) { return; }
	if(demandAddEnable==1) {
		if(definedFlag[x][y]==1) { return; }
		currDx=x;
		currDy=y;
		promptForDemandInput();
	}
	if(wsConnectEnable==1){
		if(definedFlag[x][y]==0){return;}
		if(oneWSselectedFlag==0){return;}
		oneWSselectedFlag=0;
		connectX2=x;
		connectY2=y;
		console.log("connect 2 coords:"+x+","+y);
		connectWorkstations(connectX1,connectY1,connectX2,connectY2);
		return;
	}
}

promptForDemandInput = function () {
	addDemandModal.style.display = "block";
}
addDemandNode = function(x,y,props) {
	//props: units: units demanded
	definedFlag[x][y]=1;
	var yy;
	if(y==1){yy=30;} else if(y==0){yy=0;} else {yy=30+50*(y-1);}
	var t1= new Demand(xCoord1+80*x+40,yy+65);
	t1.insertDemand();
	t1.updateDemandText(props.units);
	tentativeGraph[x][row+1-y].isDummy=false;
	tentativeGraph[x][row+1-y].units=props.units;
	tentativeGraph[x][row+1-y].sellingPrice=props.sellingPrice;
	tentativeGraph[x][row+1-y].isDemand=true;
	if(definedFlag[x][y+1]==1){tentativeGraph[x][row+1-y].childNodes.push([x,row+1-y-1]);}
	if(definedFlag[x][y-1]==1){tentativeGraph[x][row+1-y+1].childNodes.push([x,row+1-y]);}
	console.log(tentativeGraph[x][row+1-y]);
}


exportProcess = function(fileName) {
	//saves the process JSON
	var processJSONObj={
		metadata: {
			fileName: fileName,
			fixedExp: fixedExpValue,
			initCash: initCashValue
		},
		resourceInfo: tentativeResourceList,
		processInfo:tentativeGraph,
		connectorInfo:tentativeArrowList
	}
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(processJSONObj));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", fileName + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}