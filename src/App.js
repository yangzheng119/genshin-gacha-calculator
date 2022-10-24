import {InputNumber, Slider, Switch} from 'antd';
import React, {useEffect, useRef, useState} from 'react';
import { Radio,Button ,Statistic} from 'antd';
import {PieChartOutlined,LeftOutlined} from '@ant-design/icons'
import './App.scss';
import 'antd/dist/antd.min.css'
import * as echarts from 'echarts/core';
import { TooltipComponent, LegendComponent } from 'echarts/components';
import { PieChart } from 'echarts/charts';
import { LabelLayout } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
    TooltipComponent,
    LegendComponent,
    PieChart,
    CanvasRenderer,
    LabelLayout
]);

function getRandom(possibility){
    let n=Math.random()*100;
    return n < possibility ;
}

function resultFormat(result,Times,Mode){
    let resultF={
        upRole:0, //角色出率
        personalWeapon:0,  //专武出率
        constellationOfDestiny:0  //命座期望
    };
    let arr=[]
    for(let key in result){
        if(key==="[0,0,0,0,0]"||key==="[0]"){
            arr.push({
                name:"蓝天白云",
                value:result[key]
            })
            continue;
        }
        let nameArr=JSON.parse(key);
        let name="";

        if(Mode==="weapon"){
            if(nameArr[0]!==0){
                name+='up角色×'+nameArr[0];
                resultF.upRole+=result[key];
                resultF.constellationOfDestiny+=nameArr[0]*result[key];
            }
            if(nameArr[2]!==0&&nameArr[2]!==undefined){
                if(name!=="")name+="，\n";
                name+='专武×'+nameArr[2];
                resultF.personalWeapon+=result[key];
            }
            if(nameArr[3]!==0&&nameArr[3]!==undefined){
                if(name!=="")name+="，\n";
                name+='非定轨武器×'+nameArr[3];
            }
            if(nameArr[1]!==0) {
                if (name !== "") name += "，\n";
                name += '常驻角色×' + nameArr[1];
            }
            if(nameArr[4]!==0&&nameArr[4]!==undefined) {
                if (name !== "") name += "，\n";
                name += '常驻武器×' + nameArr[4];
            }
        }
        else{
            if(nameArr[0]!==0){
                name+=(nameArr[0]-1)+"命";
                resultF.upRole+=result[key];
                resultF.constellationOfDestiny+=nameArr[0]*result[key];
            }


        }
        arr.push({
            name:name,
            value:result[key]
        })
    }
    arr.sort((a,b)=>{
        return b.value-a.value;
    })

    if(arr.length>15){
        let arrShow=[];
        let sum=0;
        for(let i=0;i<arr.length;i++){
            if(sum>=Times*0.95){
                arrShow.push({
                    name:"其他",
                    value:Times-sum
                });
                break;
            }
            arrShow.push(arr[i]);
            sum+=arr[i].value;
        }
        arr=arrShow;
    }
    resultF.chartArr=arr;
    resultF.upRole=(resultF.upRole/Times*100).toFixed(1)+"%";
    resultF.personalWeapon=(resultF.personalWeapon/Times*100).toFixed(1)+"%";
    resultF.constellationOfDestiny=resultF.constellationOfDestiny/Times-1;
    if(resultF.constellationOfDestiny<0)
        resultF.constellationOfDestiny="<0命"
    else if(resultF.constellationOfDestiny>=6){
        resultF.constellationOfDestiny=">6命"
    }
    else
        resultF.constellationOfDestiny=resultF.constellationOfDestiny.toFixed(1)+"命";
    return resultF;

}


function App() {
    const [holding, setHolding] = useState(0);  //当前持有
    const [rolePoolHolding, setRolePoolHolding] = useState(0);  //角色池垫刀
    const [weaponPoolHolding, setWeaponPoolHolding] = useState(0);  //武器池垫刀
    const [guarantee,setGuarantee] = useState("withoutGuarantee");  //是否保底
    const [actMode,setActMode] = useState("weapon");    //抽卡模式
    const displayMode = useRef(false);     //抽命座展示模式

    const [roleP,setRoleP] = useState("");  //角色出率
    const [weaponP,setWeaponP] = useState("");  //专武出率
    const [constellationP,setConstellationP] = useState("");  //命座期望

    const computeTime=10000;  //模拟次数

    const panelRef = useRef();  //panel组件的ref
    const resultRef = useRef(); //resul组件的ref
    const maskRef = useRef(); //mask组件的ref
    const chartRef = useRef(); //chart组件的ref

    const myChart = useRef();  //用于操作初始化的charts

    const target = useRef(false); //避免重复初始化
    useEffect(()=>{
        if(!target.current){
            let chartDom = chartRef.current;
            myChart.current = echarts.init(chartDom);
            target.current=true;
        }

    })

    //  概率计算
    const compute=()=>{
        let result={};
        let simpleResult={};

        for(let times=0;times<computeTime;times++){
            let currentHolding=holding;  //当前持有纠缠之缘
            let rolePool=rolePoolHolding;  //当前角色池垫了几发
            let weaponPool=weaponPoolHolding;  //当前武器池垫了几发

            let commonRoleGotten=0;  //常驻角色的数量
            let upRoleGotten=0;  //up角色的数量
            let commonWeaponGotten=0;  //常驻武器的数量
            let upWeaponGotten_thisWpn=0;  //定轨up武器的数量
            let upWeaponGotten_notThisWpn=0;  //非定轨up武器的数量

            let roleGrt = guarantee === 'withGuarantee';  //角色池保底情况
            let weaponGrt=false;  //武器池保底情况
            let weaponFateValue=0;  //命定值
            if(actMode === 'weapon'){
                //抽武器
                if(upRoleGotten===0){
                    //up角色未抽到
                    while(currentHolding>0){
                        currentHolding--;
                        let p;
                        if(rolePool<=73)
                            p=0.6;
                        else
                            p=(rolePool - 73) * 6 + 0.6;
                        if(getRandom(p)){
                            //出金了
                            rolePool=0;
                            if(roleGrt||getRandom(50)){
                                //没歪
                                upRoleGotten++;
                                roleGrt=false;
                                break;
                            }
                            else {
                                commonRoleGotten++;
                                roleGrt=true;
                            }
                        }
                        else rolePool++;

                    }
                }
                if(upWeaponGotten_thisWpn===0){
                    //up武器未抽到
                    while(currentHolding>0){
                        currentHolding--;
                        let p;
                        if(weaponPool<=63)
                            p=0.7;
                        else
                            p=(weaponPool - 63) * 6 + 0.7;
                        if(getRandom(p)){
                            //出金了
                            weaponPool=0;
                            if(weaponFateValue<2){
                                //命定值不足
                                if(weaponGrt||getRandom(75)){
                                    //出了up武器
                                    if(getRandom(50)){
                                        //定轨武器
                                        upWeaponGotten_thisWpn++;
                                        weaponGrt=false;
                                        weaponFateValue=0;
                                    }
                                    else{
                                        //非定轨武器
                                        upWeaponGotten_notThisWpn++;
                                        weaponGrt=false;
                                        weaponFateValue++;
                                    }

                                }
                                else{
                                    //常驻武器
                                    commonWeaponGotten++;
                                    weaponGrt=true;
                                    weaponFateValue++;
                                }

                            }
                            else{
                                //本次定轨！
                                upWeaponGotten_thisWpn++;
                                weaponGrt=false;
                                weaponFateValue=0;

                            }
                        }
                        else weaponPool++;

                    }
                }
                let thisResult=[upRoleGotten,commonRoleGotten,upWeaponGotten_thisWpn,upWeaponGotten_notThisWpn,commonWeaponGotten];

                if(result[JSON.stringify(thisResult)]===undefined){
                    result[JSON.stringify(thisResult)]=1;
                }
                else{
                    result[JSON.stringify(thisResult)]++;
                }

            }
            else{
                //抽命座
                while(currentHolding>0){
                    currentHolding--;
                    let p;
                    if(rolePool<=73)
                        p=0.6;
                    else
                        p=(rolePool - 73) * 6 + 0.6;
                    if(getRandom(p)){
                        //出金了
                        rolePool=0;
                        if(roleGrt||getRandom(50)){
                            //没歪
                            upRoleGotten++;
                            roleGrt=false;
                        }
                        else {
                            commonRoleGotten++;
                            roleGrt=true;
                        }
                    }
                    else rolePool++;
                }
                let thisResult=[upRoleGotten,commonRoleGotten];
                if(result[JSON.stringify(thisResult)]===undefined){
                    result[JSON.stringify(thisResult)]=1;
                }
                else{
                    result[JSON.stringify(thisResult)]++;
                }
                if(displayMode.current===false){
                    let thisSimpleResult=[upRoleGotten];
                    if(simpleResult[JSON.stringify(thisSimpleResult)]===undefined){
                        simpleResult[JSON.stringify(thisSimpleResult)]=1;
                    }
                    else{
                        simpleResult[JSON.stringify(thisSimpleResult)]++;
                    }
                }


            }


            //结果

        }


        //全部显示模式下，命座显示也按武器处理
        let resultFmt=displayMode.current===false?
            actMode==="weapon"?
            resultFormat(result,computeTime,actMode):
                resultFormat(simpleResult,computeTime,actMode):
            resultFormat(result,computeTime,"weapon");
        console.log(resultFmt)
        let option = {
            tooltip: {
                trigger: 'item',
                formatter:`<div style="display:block;max-width: 200px;word-break: break-all;word-wrap: break-word;white-space:pre-wrap">{b}</div><br /><div style="background-color:#188ffd;height:10px;width:10px;
                    display: inline-block;border-radius: 50%;margin-right: 10px;"></div>概率：{d}%`,
                backgroundColor:'rgba(255,255,255,0.9)',
                backdropFilter: 'blur(2px)'
            },

            legend: {
                type: 'scroll',
                orient: 'horizontal',
                right: 20,
                left: 20,
                bottom: 0,
            },
            series: [
                {
                    name: 'Access From',
                    type: 'pie',
                    top:-20,
                    bottom:20,
                    radius: ['40%', '70%'],
                    avoidLabelOverlap: true,
                    itemStyle: {
                        borderRadius: 10,
                        borderColor: '#fff',
                        borderWidth: 2
                    },
                    label: {
                        show: false,
                        position: 'center'
                    },
                    emphasis: {
                        label: {
                            show: true,
                            fontSize: '20',
                            fontWeight: 'bold'
                        }
                    },
                    labelLine: {
                        show: false
                    },
                    data: resultFmt.chartArr
                }
            ]
        };
        setRoleP(resultFmt.upRole);
        setWeaponP(resultFmt.personalWeapon);
        setConstellationP(resultFmt.constellationOfDestiny);
        myChart.current.setOption(option);


        //修改样式
        resultRef.current.style.bottom="0vh";
        panelRef.current.style.transform="translateY(-20vh) scale(0.9)";
        panelRef.current.style.webkitTransform="translateY(-20vh) scale(0.9)";
        maskRef.current.style.height="100vh";

    }
    const goBack=()=>{

        // eslint-disable-next-line no-lone-blocks
        {
            resultRef.current.style.bottom="-65vh";
            panelRef.current.style.transform="translateY(0) scale(1)";
            maskRef.current.style.height="0";
        }//改变样式
        setTimeout(()=>{
            myChart.current.setOption({
                series: [
                    {
                        data: []
                    }
                ]
            });
        },500)

    }

    return (
    <div className="App">
        <div className={"contentBody"}>
            {/*<img src={logo} className="App-logo" alt="logo" />*/}
            <div className={"panel"} ref={panelRef}>
{/*/////////////////////*/}
                <div className={'p'}>
                    <span className={'block'}>持有</span>
                    <div className={"row"}>
                        <Slider
                            min={0}
                            max={actMode==="weapon"?500:700}
                            onChange={(newValue)=>{
                                setHolding(newValue);
                            }}
                            value={typeof holding === 'number' ? holding : 0}
                        />
                        <InputNumber
                            min={0}
                            max={actMode==="weapon"?500:700}
                            style={{ margin: '0 16px' }}
                            value={holding}
                            onChange={(newValue)=>{
                                setHolding(newValue);
                            }}
                        />
                    </div>

                </div>
{/*/////////////////////*/}
                <div className={'p'}>
                    <span className={'block'}>角色池垫刀</span>
                    <div className={"row"}>
                        <Slider
                            min={0}
                            max={89}
                            onChange={(newValue)=>{
                                setRolePoolHolding(newValue);
                            }}
                            value={typeof rolePoolHolding === 'number' ? rolePoolHolding : 0}
                            />
                        <InputNumber
                            min={0}
                            max={89}
                            style={{ margin: '0 16px' }}
                            value={rolePoolHolding}
                            onChange={(newValue)=>{
                                setRolePoolHolding(newValue);
                            }}
                        />
                    </div>


                </div>
{/*///////////////////*/}
                <div className={'p'}>
                    <span className={'block'}>武器池垫刀</span>
                    <div className={"row"}>
                        <Slider
                            min={0}
                            max={79}
                            onChange={(newValue)=>{
                                setWeaponPoolHolding(newValue);
                            }}
                            value={typeof weaponPoolHolding === 'number' ? weaponPoolHolding : 0}
                        />
                        <InputNumber
                            min={0}
                            max={79}
                            style={{ margin: '0 16px' }}
                            value={weaponPoolHolding}
                            onChange={(newValue)=>{setWeaponPoolHolding(newValue);}}
                        />
                    </div>
                </div>
                <div className={'p'}>
                    <Radio.Group
                        options={[
                            { label: '小保底', value: 'withoutGuarantee' },
                            { label: '大保底', value: 'withGuarantee' },
                        ]}
                        onChange={({ target: { value } })=>{
                            setGuarantee(value)
                        }}
                        value={guarantee}
                        optionType={"button"}
                        buttonStyle="solid"
                        style={{
                            margin:"0 20px 10px 0"
                        }}
                    />
                    <Radio.Group
                        options={[
                            { label: '抽专武', value: 'weapon' },
                            { label: '抽命座', value: 'constellation' },
                            { label: '...', value: '...', disabled: true },
                        ]}
                        onChange={({ target: { value } })=>{
                            setActMode(value)
                        }}
                        value={actMode}
                        optionType={"button"}
                        buttonStyle="solid"
                    />
                </div>
                <div className={'p'} style={{display:"flex"}}>
                    <Button
                        type="primary"
                        icon={ <PieChartOutlined />}
                        style={{flex:1}}
                        onClick={compute}
                    >
                        计算
                    </Button>
                </div>



            </div>
            <div className={"result"} ref={resultRef}>
                <div className={"control"}>
                    <Button
                        type="text"
                        icon={<LeftOutlined />}
                        onClick={goBack}
                    >
                        返回
                    </Button>

                    <Switch checkedChildren="全部展示" unCheckedChildren="只看命座" onChange={i=>{
                        displayMode.current=i;
                        compute();
                    }}
                    style={{display:actMode==="weapon"?"none":"block"}}
                    />

                </div>

                <div className={"chart"} id={"chart"} ref={chartRef}></div>
                <div className={"show"}>
                    <Statistic title="角色出率" value={roleP} prefix={<PieChartOutlined />} />
                    <Statistic title="专武出率" value={actMode==='weapon'?weaponP:"--"}  />
                    <Statistic title="命座期望" value={actMode==='weapon'?"--":constellationP}  />
                </div>



            </div>
            <div className={"mask"} ref={maskRef} onClick={goBack}></div>


        </div>
    </div>
  );
}

export default App;
