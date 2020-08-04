//class Node
//properties:
//status
//0: IDLE: doesn't have machine assigned to it
//1: SETTING UP: has machine assigned but is in process of setting up
//2: RUNNING: has machine assigned and is ready to work

setupTimeLogger=[];
procTimeLogger=[];

class Node {
	constructor (type,createdUnits,setupConfig,procConfig,children, isDummy,isDemand) {
		//timeConfig objects have the following structure:

		//0. Deterministic
		//code: 0
		//time: deterministic setup/process time

		//1. Normal distribution
		//code: 1
		//mean: mean time of setup/process
		//sd: standard deviation of setup/process

		//2. Exponential distribution
		//code: 2
		//lambda: rate of the distribution (mean inverse)

		this.type=type;
		this.status=0;
		this.units=createdUnits;
		this.setupConfig=setupConfig;
		this.procConfig=procConfig;
		this.recomputeSetupTime = function () { var temp = computeTime(this.setupConfig);  this.setupTime=temp; setupTimeLogger.push(temp); };
		this.setupTime= computeTime(this.setupConfig);
		this.displaySetupTime= getDisplayTime(this.setupConfig);
		this.timeSinceSetup=0;
		this.recomputeProcTime = function () {  var temp= computeTime(this.procConfig); this.procTime=temp; procTimeLogger.push(temp); };
		this.procTime= computeTime(this.procConfig);
		this.displayProcTime = getDisplayTime(this.procConfig);
		this.timeSinceProduction=0;
		if(isDummy) this.isDummy=true;
		if(typeof children != 'undefined' && children instanceof Array ) this.childNodes=children.slice();// contains (x,y) of child Nodes
		this.productionMode=false;
		if(isDemand) this.isDemandNode=true;
	}
}

getDisplayTime = function (timeConfig) {
	if (typeof timeConfig == 'number') {
		return timeConfig;
	}

	if (timeConfig.code==0){
		return timeConfig.time;
	} else {
		return timeConfig.mean;
	}
}
computeTime = function (timeConfig) {
	//timeConfig objects have the following structure:

	//for deterministic, it can straightaway be a number too 

	//0. Deterministic
	//code: 0
	//time: deterministic setup/process time

	//1. Normal distribution
	//code: 1
	//mean: mean time of setup/process
	//sd: standard deviation of setup/process

	//2. Exponential distribution
	//code: 2
	//mean: mean time
	if (typeof timeConfig == 'number') {
		return timeConfig;
	}

	if (timeConfig.code==0){
		return timeConfig.time;
	} else if (timeConfig.code==1) {
		return (timeConfig.mean+NormSInv(Math.random())*timeConfig.sd).toFixed()/1;
	} else {
		return ((-1*timeConfig.mean)*Math.log(1-Math.random())).toFixed()/1;
	}
}



var len1=0;
var len2= 0;
function FERefresh () {
	//all frontend refreshes will happen here
	updateCurrCashDisplay();
	incrementGlobalTimeKeeperMinutesFE();
	for(var i=0;i<len1;i++) {
		for(var j=0;j<len2;j++) {
			if(typeof processGraph[i][j].isDummy == 'undefined' || processGraph[i][j].isDummy==false){
				if(j==0){
					processFEObjs[i][j].updateRMText(""+processGraph[i][j].units);
				} else if(j==len2-1) {
					processFEObjs[i][j].updateDemandText(""+processGraph[i][j].units);
				} else {
					processFEBuffers[i][j].updateBufferText(""+processGraph[i][j].units);
				}
			}
		}
	}
}

function runMode (){
	globalTimeKeeper.min+=1;
	//if(Number.isInteger(globalTimeKeeper.min)){
	incrementGlobalTimeKeeperMinutes();
	if(thisHourScheduleList && thisHourScheduleList[globalTimeKeeper.min]){
		var tasksToBePerformed=thisHourScheduleList[globalTimeKeeper.min];
		for(var p=0;p<tasksToBePerformed.length;p++){
			console.log(tasksToBePerformed[p]);
			executeTask(tasksToBePerformed[p]);
		}
	}
	//}
	for (var i=0;i<len1;i++) {
		for (var j=0; j<len2; j++) {
			if(typeof processGraph[i][j].isDummy == 'undefined' || processGraph[i][j].isDummy==false){	
				if(j==len2-1) {
					//demand stuff
					if(processGraph[processGraph[i][j].childNodes[0][0]][processGraph[i][j].childNodes[0][1]].units>0) {
						if(processGraph[i][j].units>0){
							processGraph[i][j].units-=1;
						//processFEObjs[i][j].updateDemandText(""+processGraph[i][j].units);
						currCash+=processGraph[i][j].sellingPrice;
						dayThroughput+=processGraph[i][j].sellingPrice;
						//updateCurrCashDisplay();
						processGraph[processGraph[i][j].childNodes[0][0]][processGraph[i][j].childNodes[0][1]].units-=1;
					}
					}
				} else {
					if(processGraph[i][j].status==3) {
						//repairing
						processGraph[i][j].timeSinceRepair+=1;
						if(processGraph[i][j].timeSinceRepair>=processGraph[i][j].currRepairTime){
							processGraph[i][j].status=2;
							resourceObjs[processFEObjs[i][j].WSComp.attrs.resourceX][processFEObjs[i][j].WSComp.attrs.resourceY].updateResourceStatusText("prod");
							continue;
						}
					}
					else if(processGraph[i][j].status==1){
						//setting up
						//processGraph[i][j].timeSinceSetup=(processGraph[i][j].timeSinceSetup+0.2).toFixed(1)/1;
						processGraph[i][j].timeSinceSetup+=1;
						resourceUtilization[processGraph[i][j].type].setup+=1;
						if(processGraph[i][j].timeSinceSetup>=processGraph[i][j].setupTime || processGraph[i][j].setupTime==0){
							processGraph[i][j].status=2; //mark it as running
							resourceObjs[processFEObjs[i][j].WSComp.attrs.resourceX][processFEObjs[i][j].WSComp.attrs.resourceY].updateResourceStatusText("idle");
							processFEObjs[i][j].running();
						}
						continue;
					} else if (processGraph[i][j].status==2){
						if(processGraph[i][j].productionMode==false) {
							//check if it can run
							var canRun=0;
							for(var k=0;k<processGraph[i][j].childNodes.length;k++) {
								if(processGraph[processGraph[i][j].childNodes[k][0]][processGraph[i][j].childNodes[k][1]].units>0){
									if(processGraph[i][j].hasLimitSet==true){
										if(processGraph[i][j].limit>0){
											canRun=1;
										} else {
											canRun=0;
										}
									} else {
										canRun=1;
									} 
								} else {
									canRun=0; 

									break;
								}
							}
							if (canRun) {
								processGraph[i][j].productionMode=true;
								resourceObjs[processFEObjs[i][j].WSComp.attrs.resourceX][processFEObjs[i][j].WSComp.attrs.resourceY].updateResourceStatusText("prod");
								processGraph[i][j].timeSinceProduction=0;
								for(var k=0;k<processGraph[i][j].childNodes.length;k++) {
									processGraph[processGraph[i][j].childNodes[k][0]][processGraph[i][j].childNodes[k][1]].units-=1;
								}
							} else {
								processGraph[i][j].productionMode=false;
								resourceObjs[processFEObjs[i][j].WSComp.attrs.resourceX][processFEObjs[i][j].WSComp.attrs.resourceY].updateResourceStatusText("idle");
							}
						} else {
								processGraph[i][j].timeSinceBreakdown+=1;
								if(processGraph[i][j].timeSinceBreakdown>=processGraph[i][j].currBreakDownTime){
									processGraph[i][j].status=3;
									processGraph[i][j].currBreakDownTime=((-1*processGraph[i][j].setupConfig.mf)*Math.log(1-Math.random())).toFixed()/1;
									processGraph[i][j].currRepairTime=((-1*processGraph[i][j].setupConfig.mr)*Math.log(1-Math.random())).toFixed()/1;
									processGraph[i][j].timeSinceRepair=0;
									processGraph[i][j].timeSinceBreakdown=0;
									console.log(processGraph[i][j].currBreakDownTime);
									resourceObjs[processFEObjs[i][j].WSComp.attrs.resourceX][processFEObjs[i][j].WSComp.attrs.resourceY].updateResourceStatusText("repair");
								}
								else {
									processGraph[i][j].timeSinceProduction+=1;
									resourceUtilization[processGraph[i][j].type].prod+=1;
									if (processGraph[i][j].timeSinceProduction>=processGraph[i][j].procTime) {
										processGraph[i][j].units+=1;
										if(processGraph[i][j].hasLimitSet){processGraph[i][j].limit-=1;}
										processGraph[i][j].recomputeProcTime();
										processGraph[i][j].timeSinceProduction=0;
										processGraph[i][j].productionMode=false;
									}
								}
							}
						}
					}
				}	
				// if(processFEBuffers[i][j]!="dummy") {
				// 	if(j!=0) {
				// 		processFEBuffers[i][j].updateBufferText(""+processGraph[i][j].units);
				// 	} else {
				// 		//processFEObjs[i][j].updateRMText(""+processGraph[i][j].units);
				// 	}
				// } 
			}
		}
	}


var processFEObjs=[]; //Process frontend Objects
var processFEBuffers = [];
var processFEObjAuras=[]; //transparent aura for interaction
var graphParser = function(processGraphMatrix) {
	len1=processGraphMatrix.length;
	len2=processGraphMatrix[0].length;
	var yMax=30+50*(len2-1);
	var yy=0;
	for (var i=0;i<len1;i++) {
		processFEObjs.push(new Array());
		processFEObjAuras.push(new Array());
		processFEBuffers.push(new Array());
		for (var j=0; j<len2;j++) {
			processGraph[i][j].units=processGraph[i][j].units/1;
			if(j==0){yy=0;} else if (j==len2-1){yy=yy=yMax} else {yy=30+50*j;}
			if(j>0&&j<len2-1){
				if(i==0){
					var tempText2=new Konva.Text({
						x: xCoord1-65,
				        y: yCoord1+yMax-50*j-35,
				        text:
				          j+'',
				        fontSize: 15,
				        fontFamily: 'Arial',
				        width: 20,
				        //padding: 20,
				        align: 'center',
				        fill:'black'
					});
					layer.add(tempText2);
					stage.add(layer);
				}
				processFEObjs[i].push(new WS(xCoord1+80*i,yCoord1+yMax-(yy),resourceColourList[processGraphMatrix[i][j].type],0,0,0,i,j,[],[]));
				processFEBuffers[i].push(new Buffer(xCoord1+80*i-20,yCoord1+yMax-(yy+35),i,j,[],[]));
				if(!processGraphMatrix[i][j].isDummy) {
					processGraph[i][j].setupTime=computeTime(processGraph[i][j].setupConfig);
					processGraph[i][j].currBreakDownTime=((-1*processGraph[i][j].setupConfig.mf)*Math.log(1-Math.random())).toFixed()/1;
					processGraph[i][j].currRepairTime=0
					processGraph[i][j].timeSinceRepair=0;
					processGraph[i][j].timeSinceBreakdown=0;
					processFEObjs[i][j].insertWS();
					processFEBuffers[i][j].insertBuffer();
					processFEObjs[i][j].updateWSText(""+processGraphMatrix[i][j].displayProcTime);
					processFEBuffers[i][j].updateBufferText(processGraphMatrix[i][j].units);
					// processFEObjAuras[i].push(new Konva.Rect({
					// 	i: i,
					// 	j: j,
					// 	x: xCoord1+80*i-20,
		   //              y: yCoord1+yMax-(yy)-15,
		   //              width: 40,
		   //              height: 30,
		   //              fill: 'white',
		   //              stroke: 'black',
		   //              strokeWidth: 2,
		   //              opacity:0,
		   //              id: 'aura-'+i+'-'+j
					// }));
					// layer.add(processFEObjAuras[i][j]);
					// stage.add(layer);
					// processFEObjAuras[i][j].on('mouseup', function(){
	    //                    	if(wsEditable){
				 //            clearInterval(simulationInterval);
				 //            clearInterval(frontendInterval);
				 //            currWSBeingEditedx=this.attrs.i;
				 //            currWSBeingEditedy=this.attrs.j;
				 //            wsParamsModal.style.display="block";
				 //        }
	    //             })  ;
				} 
				//else {processFEObjAuras[i].push(0);}
			} else if (j==0) {
				//insert RM
				processFEObjs[i].push(new RM(xCoord1+80*i,yCoord1+yMax-(yy+50)));

				var tempText=new Konva.Text({
					x: xCoord1+80*i-10,
			        y: yCoord1+yMax-(yy+50)+25,
			        text:
			          String.fromCharCode(65+i),
			        fontSize: 15,
			        fontFamily: 'Arial',
			        width: 20,
			        //padding: 20,
			        align: 'center',
			        fill:'black'
				});
				layer.add(tempText);
	
				

				
				
				processFEBuffers[i].push("dummyRM");
				if(!processGraphMatrix[i][j].isDummy) {processFEObjs[i][j].insertRM();
				var opt = document.createElement('option');
				opt.value = ''+i+'-0';
				opt.innerHTML = String.fromCharCode(65+i);
				document.getElementById('schedulerMaterial').appendChild(opt);
				stage.add(layer);
				processFEObjAuras[i].push(new Konva.Rect({
					x: xCoord1+80*i-20,
	                y: yCoord1+yMax-(yy+50)-15,
	                width: 40,
	                height: 30,
	                fill: 'white',
	                stroke: 'black',
	                strokeWidth: 2,
	                opacity:0,
	                id: 'aura-'+i+'-'+j
				}));
				layer.add(processFEObjAuras[i][j]);
				stage.add(layer);
				processFEObjAuras[i][j].on('mouseup', function(){
                    rmPurchaseInitiate(this.id());
                })  ;
			} else {processFEObjAuras[i].push(0);}
			} else {
				processFEObjs[i].push(new Demand(xCoord1+80*i,yCoord1,processGraphMatrix[i][j].units));
				processFEBuffers[i].push("dummy");
				if(!processGraphMatrix[i][j].isDummy) {
					processFEObjs[i][j].insertDemand();
					processFEObjs[i][j].updateDemandText(""+processGraphMatrix[i][j].units);
					processGraphMatrix[i][j].original_units=processGraphMatrix[i][j].units;
				}
			}
		}
	}
	stage.on('click', function(){
		 var position=stage.getPointerPosition();
		 if(position.x>xCoord1-20&& position.y>yCoord1){
		 	var yy=len2-2-(((position.y-yCoord1-30)/50).toFixed()/1);
			var xx=((position.x-xCoord1+20)/80).toFixed()/1;
	       	if(wsEditable&&processGraph[xx][yy].isDummy==false && yy!=0&&yy!=len2-1){
		        clearInterval(simulationInterval);
		        clearInterval(frontendInterval);
		        currWSBeingEditedx=xx;
		        currWSBeingEditedy=yy;
		        wsParamsModal.style.display="block";
			}
		}
	});
}

currRMPurchasex=0;
currRMPurchasey=0;
rmPurchaseInitiate = function(id) {
	clearInterval(simulationInterval);
	clearInterval(frontendInterval);
	var x= id.split('-')[1];
	var y= id.split('-')[2];
	currRMPurchasey=y;
	currRMPurchasex=x;
	rmPurchaseModal.style.display="block";
}

arrowParser = function(arrowArray){
	//each element of arrow array contains endpoints of the arrow to be inserted in the form of a tuple (x1,y1,x2,y2)
	var temp;
	for (var i=0;i<arrowArray.length;i++) {
		temp=new Arrow(arrowArray[i][0]-40,arrowArray[i][1]-15,arrowArray[i][2]-40,arrowArray[i][3]-15);
		temp.insertArrow();
	}
}
resourceObjs=[];
resourceAuras=[];


resourceParser = function(resourceArray) {
	document.getElementById('schedulerResType').onchange = function(){
	
	for(var i=0;i<len1*len2;i++){
		document.getElementById('schedulerResNum').remove(0);
		document.getElementById('schedulerTask').remove(0);
	}
	var k=document.getElementById('schedulerResType').value/1;
	for(var i=0;i<masterJSON.resourceInfo[k].num;i++){
		var opt = document.createElement('option');
		opt.value = i;
		opt.innerHTML = i;
		document.getElementById('schedulerResNum').appendChild(opt);
	}
	for(var i=0;i<len1;i++){
		for (var j=1;j<len2-1;j++){
			if(processGraph[i][j].type==k&&processGraph[i][j].isDummy==false){
				var opt = document.createElement('option');
				opt.value = i+'-'+j;
				opt.innerHTML = String.fromCharCode(65+i)+''+j;
				document.getElementById('schedulerTask').appendChild(opt);
			}
		}
	}
}
	var code=0;
	var timeDisplay;
	var temp= new Konva.Text({
		x: xCoord2-50,
	    y: yCoord2-30,
	    text:'Setup',
	    fontSize: 15,
	    fontFamily: 'Arial',
	    width: 50,
	    align: 'left'
	});
	layer.add(temp);
	stage.add(layer);
	for(var i=0;i<resourceArray.length;i++) {
		var opt = document.createElement('option');
		opt.value = i;
		opt.innerHTML = resourceColourList[i];
		document.getElementById('schedulerResType').appendChild(opt);

		resourceUtilization.push({setup:0,prod:0,usedFlag:0});
		resourceObjs.push(new Array());
		resourceAuras.push(new Array());
		code=resourceArray[i].setupTimeConfig.code;
		if(code==0){timeDisplay=resourceArray[i].setupTimeConfig.time;} 
		else {timeDisplay=resourceArray[i].setupTimeConfig.mean;}
		for(var j=0;j<resourceArray[i].num;j++) {

			resourceObjs[i].push(new Resource({
				x:xCoord2+60*j,
				y:yCoord2+100*(i),
				colour:resourceArray[i].colour, 
				stroke:'black',
				setupTime:resourceArray[i].setupTimeConfig, 
				id: 'Resource-'+i+'-'+j
			}));
			resourceAuras[i].push(new ResourceAura({
				i:i,
				j:j,
				x:xCoord2+60*j,
				y:yCoord2+100*(i),
				colour:resourceArray[i].colour, 
				stroke:'black',
				setupTime:resourceArray[i].setupTimeConfig, 
				id: 'Resource-'+i+'-'+j,
				type: resourceArray[i].type
			}));

		}
		var temp2= new Konva.Text({
			x: xCoord2-50,
		    y: yCoord2+17.5+100*(i),
		    text:""+timeDisplay,
		    fontSize: 15,
		    fontFamily: 'Arial',
		    width: 50,
		    //padding: 20,
		    align: 'left'
		});
		layer.add(temp2);
		stage.add(layer);
	}
	schedulerRMBtn=document.getElementById('schedulerAddPurchasingSchedule');

	schedulerRMBtn.onclick = function() {
	var material=document.getElementById('schedulerMaterial').value.split('-');
	var quantity=document.getElementById('schedulerQuantity').value;
	var hr=document.getElementById('schedulerHour').value;
	var min=document.getElementById('schedulerMin').value;
	var week=Math.trunc(hr/(8*5))+1;
	var day=Math.trunc(((hr/(8*5))-Math.trunc(hr/(8*5)))*5)+1;
	hr-=(week-1)*(8*5)+(day-1)*8;
	var minDisplay="";
	if(min/1 <10){minDisplay+="0"+min; } else {minDisplay=min;}
	document.getElementById("purchasingScheduleView").innerHTML+="Week "+week+", Day "+day+" 0"+hr+":"+minDisplay+" "+quantity+" units of "+String.fromCharCode(65+material[0]/1)+"<br />";
	if(scheduleList[week]){
		if(scheduleList[week][day]){
			if(scheduleList[week][day][hr]){
				if(scheduleList[week][day][hr][min]){
					scheduleList[week][day][hr][min].push({type:0,RMx:material[0]/1,RMy:material[1]/1,quantity:quantity});
				} else {
					scheduleList[week][day][hr][min]=new Array();
					scheduleList[week][day][hr][min].push({type:0,RMx:material[0]/1,RMy:material[1]/1,quantity:quantity});
				}
			} else {
				scheduleList[week][day][hr]={};
				scheduleList[week][day][hr][min]=new Array();
				scheduleList[week][day][hr][min].push({type:0,RMx:material[0]/1,RMy:material[1]/1,quantity:quantity});
			}
		} else {
			scheduleList[week][day]={};
			scheduleList[week][day][hr]={};
			scheduleList[week][day][hr][min]=new Array();
			scheduleList[week][day][hr][min].push({type:0,RMx:material[0]/1,RMy:material[1]/1,quantity:quantity});
		}
	} else {
		scheduleList[week]={};
		scheduleList[week][day]={};
		scheduleList[week][day][hr]={};
		scheduleList[week][day][hr][min]=new Array();
		scheduleList[week][day][hr][min].push({type:0,RMx:material[0]/1,RMy:material[1]/1,quantity:quantity});
	}
}



schedulerResBtn=document.getElementById('schedulerAddResourceSchedule');
schedulerResBtn.onclick = function() {
	var resType=document.getElementById('schedulerResType').value;
	var resNum=document.getElementById('schedulerResNum').value;
	var resTask=document.getElementById('schedulerTask').value.split('-');
	var hr=document.getElementById('schedulerHour2').value;
	var min=document.getElementById('schedulerMin2').value;
	var week=Math.trunc(hr/(8*5))+1;
	var day=Math.trunc(((hr/(8*5))-Math.trunc(hr/(8*5)))*5)+1;
	hr-=(week-1)*(8*5)+(day-1)*8;
	var minDisplay="";
	if(min/1 <10){minDisplay+="0"+min; } else {minDisplay=min;}
	document.getElementById("allocationScheduleView").innerHTML+="Week "+week+", Day "+day+" 0"+hr+":"+minDisplay+" Assign "+resourceColourList[resType]+"("+resNum+") to "+String.fromCharCode(65+resTask[0]/1)+resTask[1]+"<br />";

	if(scheduleList[week]){
		if(scheduleList[week][day]){
			if(scheduleList[week][day][hr]){
				if(scheduleList[week][day][hr][min]){
					scheduleList[week][day][hr][min].push({type:1,resType:resType,resNum:resNum,taskX:resTask[0]/1,taskY:resTask[1]/1});
				} else {
					scheduleList[week][day][hr][min]=new Array();
					scheduleList[week][day][hr][min].push({type:1,resType:resType,resNum:resNum,taskX:resTask[0]/1,taskY:resTask[1]/1});
				}
			} else {
				scheduleList[week][day][hr]={};
				scheduleList[week][day][hr][min]=new Array();
				scheduleList[week][day][hr][min].push({type:1,resType:resType,resNum:resNum,taskX:resTask[0]/1,taskY:resTask[1]/1});
			}
		} else {
			scheduleList[week][day]={};
			scheduleList[week][day][hr]={};
			scheduleList[week][day][hr][min]=new Array();
			scheduleList[week][day][hr][min].push({type:1,resType:resType,resNum:resNum,taskX:resTask[0]/1,taskY:resTask[1]/1});
		}
	} else {
		scheduleList[week]={};
		scheduleList[week][day]={};
		scheduleList[week][day][hr]={};
		scheduleList[week][day][hr][min]=new Array();
		scheduleList[week][day][hr][min].push({type:1,resType:resType,resNum:resNum,taskX:resTask[0]/1,taskY:resTask[1]/1});
	}
}
}



metadataParser = function(metadataObj) {
	//populate time data
	layer.add(globalTimeKeeperObj.hr);
	layer.add(globalTimeKeeperObj.min);
	layer.add(globalTimeKeeperObj.colon);
	layer.add(globalTimeKeeperObj.DayDescriber);
	layer.add(globalTimeKeeperObj.DayCounter);
	layer.add(globalTimeKeeperObj.WeekDescriber);
	layer.add(globalTimeKeeperObj.WeekCounter);
	

	//populate financial data
	
	layer.add(globalFinanceObj.currCash);
	layer.add(globalFinanceObj.cashDescriber);
	layer.add(globalFinanceObj.fixedExp);
	layer.add(globalFinanceObj.fixedExpDescriber);
	stage.add(layer);
	fixedExp=metadataObj.fixedExp;
	var text = layer.find('#fixedExp')[0];
	text.setAttr('text',''+fixedExp);
	currCash=metadataObj.initCash;
	text = layer.find('#currCash')[0];
	text.setAttr('text',''+currCash);
	layer.draw();

	
	return;
}

checkWhichBox= function(position,type) {
	wsEditable=true;
	if (position.x+25>xCoord1&&position.y>yCoord1){
		var yy=len2-2-(((position.y-yCoord1-30)/50).toFixed()/1);
		var xx=((position.x-xCoord1+20)/80).toFixed()/1;
		var oldX=type.attrs.assignedToX;
		var oldY=type.attrs.assignedToY;

		if(processGraph[xx][yy].type==type.attrs.type){
			assignResourceToTask(type,oldX,oldY,xx,yy);
			// type.setAttr('opacity', 0);
	  //       type.setAttr('x', type.attrs.original_x);
	  //       type.setAttr('y', type.attrs.original_y);
	  //       type.setAttr('width', 50);
	  //       type.setAttr('height', 50);
	  //       layer.draw();
	  //       if(oldX>-1){
	  //       	if(processGraph[oldX][oldY].productionMode==true){
	  //       		for(var k=0;k<processGraph[oldX][oldY].childNodes.length;k++) {
	  //       			processGraph[processGraph[oldX][oldY].childNodes[k][0]][processGraph[oldX][oldY].childNodes[k][1]].units+=1;
	  //       		}
	  //       	}
	  //       	processGraph[oldX][oldY].status=0;
	  //       	processFEObjs[oldX][oldY].notRunning();
	  //       }
	  //       processGraph[xx][yy].status=1;
	  //       if(processGraph[xx][yy].setupTime==0){processGraph[xx][yy].status=2;}
	  //       resourceUtilization[processGraph[xx][yy].type].usedFlag=1;
	  //       processFEObjs[xx][yy].WSComp.attrs.resourceX=type.attrs.i;
	  //       processFEObjs[xx][yy].WSComp.attrs.resourceY=type.attrs.j;
	  //       type.setAttr('assignedToX', xx);
	  //       type.setAttr('assignedToY', yy);
	  //       resourceObjs[type.attrs.i][type.attrs.j].updateResourceText(xx+","+yy);
	  //       resourceObjs[type.attrs.i][type.attrs.j].updateResourceStatusText("setup");
		} else {
			type.setAttr('opacity', 0);
	        type.setAttr('x', type.attrs.original_x);
	        type.setAttr('y', type.attrs.original_y);
	        type.setAttr('width', 50);
	        type.setAttr('height', 50);
	        layer.draw();
		}
	}
}


assignResourceToTask = function (ResourceCompObject,x1,y1,x2,y2){
	//re-assigns a Resource from x1,y1 to x2,y2
	ResourceCompObject.setAttr('opacity', 0);
	        ResourceCompObject.setAttr('x', ResourceCompObject.attrs.original_x);
	        ResourceCompObject.setAttr('y', ResourceCompObject.attrs.original_y);
	        ResourceCompObject.setAttr('width', 50);
	        ResourceCompObject.setAttr('height', 50);
	        layer.draw();
	        if(x1>-1){
	        	if(processGraph[x1][y1].productionMode==true){
	        		for(var k=0;k<processGraph[x1][y1].childNodes.length;k++) {
	        			processGraph[processGraph[x1][y1].childNodes[k][0]][processGraph[x1][y1].childNodes[k][1]].units+=1;
	        		}
	        	}
	        	processGraph[x1][y1].status=0;
	        	processFEObjs[x1][y1].notRunning();
	        }
	        processGraph[x2][y2].status=1;
	        if(processGraph[x2][y2].setupTime==0){processGraph[x2][y2].status=2;} else {  processGraph[x2][y2].recomputeSetupTime();}
	        resourceUtilization[processGraph[x2][y2].type].usedFlag=1;
	        processFEObjs[x2][y2].WSComp.attrs.resourceX=ResourceCompObject.attrs.i;
	        processFEObjs[x2][y2].WSComp.attrs.resourceY=ResourceCompObject.attrs.j;
	        ResourceCompObject.setAttr('assignedToX', x2);
	        ResourceCompObject.setAttr('assignedToY', y2);
	        resourceObjs[ResourceCompObject.attrs.i][ResourceCompObject.attrs.j].updateResourceText(String.fromCharCode(65+x2)+y2);
	        resourceObjs[ResourceCompObject.attrs.i][ResourceCompObject.attrs.j].updateResourceStatusText("setup");
	        var tempmin="";
			if(globalTimeKeeper.min<10){tempmin="0"+globalTimeKeeper.min;} else {tempmin=globalTimeKeeper.min}
	activityLog.push('Week '+globalTimeKeeper.week+' Day '+globalTimeKeeper.day+' 0'+globalTimeKeeper.hr+':'+tempmin+'\nAssigned '+resourceColourList[ResourceCompObject.attrs.type/1]+' to task at '+String.fromCharCode(65+x2)+''+y2);
}

getAllChildNodes = function (node,i,j) {
	var childNodesList=[];
	for(var k=0;k<node.childNodes.length;k++){
		childNodesList.push(processGraph[processGraph[i][j].childNodes[k][0]][processGraph[i][j].childNodes[k][1]]);
		if(processGraph[i][j].childNodes[k][1]>1) childNodesList=childNodesList.concat(getAllChildNodes(processGraph[processGraph[i][j].childNodes[k][0]][processGraph[i][j].childNodes[k][1]],processGraph[i][j].childNodes[k][0],processGraph[i][j].childNodes[k][1]));
	}
	return childNodesList;
}

getProductDevTime = function(prodIndex) {
	var resTimeMap=[];
	for(var i=0;i<resourceColourList.length;i++){
		resTimeMap.push(0);
	}

	var childList=getAllChildNodes(processGraph[prodIndex][len2-1],prodIndex,len2-1);

	for(var i=0;i<childList.length;i++){
		resTimeMap[childList[i].type]+=childList[i].displayProcTime/1;
	}

	for(var i=0;i<resourceColourList.length;i++){
		resTimeMap[i]*=processGraph[prodIndex][len2-1].units;
	}
	return resTimeMap;
}

getBottleNeck = function() {
	var prodIndices=[];
	var resTimeMap=[];
	var resLength=masterJSON.resourceInfo.length;
	for(var i=0;i<resLength;i++){
		resTimeMap.push(0);
	}
	for(var i=0;i<len1;i++){
		if(processGraph[i][len2-1].isDummy==false){
			prodIndices.push(i);
		}
	}
	var temp;
	for(var i=0;i<prodIndices.length;i++){
		temp=getProductDevTime(prodIndices[i]);
		for(var j=0;j<resLength;j++){
			resTimeMap[j]+=temp[j];
		}
	}
	var availMinMap=[];
	for(var i=0;i<resLength;i++){
		availMinMap.push(5*8*60*masterJSON.resourceInfo[i].num);
	}
	var largest=0;
	var largestIndex=0;
	for(var i=0;i<resLength;i++){
		temp=1.0*resTimeMap[i]/availMinMap[i];
		if(temp>largest){
			largestIndex=i;
			largest=temp;
		}
	}
	return resourceColourList[largestIndex];
}