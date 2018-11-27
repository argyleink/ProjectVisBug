export default function TapTargetHighlight() {

  var FINGER_SIZE_PX = 48;
  var checkOverlapBetweenFingers = false
  var scoreBasedOnOverlapArea = true





  function simplifyBCRs(bcrs) {
    bcrs = bcrs.filter(bcr => {
      for (const possiblyContainingBcr of bcrs) {
        if (possiblyContainingBcr === bcr) {
          continue;
        }
        // todo: do this differently probably
        if (possiblyContainingBcr.filteredOut) {
          continue;
        }
        if (bcrContains(possiblyContainingBcr, bcr)) {
          bcr.filteredOut = true;
          return false;
        }
      }
      return true;
    });

    // todo: test cases for all of these things... maybe simplify by just having a fn called simplifyBCRs or sth

    bcrs = mergeTouchingBCRs(bcrs);


    return bcrs;
  }

  function mergeTouchingBCRs(bcrs) {
    function almostEqual(a, b) {
      return Math.abs(a - b) <=2;
    }

    // better description/name: merge parallel bcrs with overlap
    // console.log('merge adjacent', JSON.stringify(bcrs, null, 4));
    // todo: merge these two loops!
    for (let i =0; i<bcrs.length; i++) {
      for (let j = 0; j<bcrs.length; j++) {
        if (i === j) {
          continue;
        }
        const bcrA = bcrs[i];
        const bcrB = bcrs[j];
        if (almostEqual(bcrA.top, bcrB.top) && almostEqual(bcrA.bottom, bcrB.bottom)) {
          // console.log('line up', bcrA.right, bcrB.left);
          // they line up horizontally
          if (bcrA.right <= bcrB.left && bcrB.right >= bcrA.right) {
            // console.log('merge');
            bcrs.splice(i, 1);
            if (i<j) {
              j--; // update index after delete
            }
            bcrs.splice(j, 1);
            const top = Math.min(bcrA.top, bcrB.top);
            const bottom = Math.max(bcrA.bottom, bcrB.bottom);
            bcrs.push({
              left: bcrA.left,
              right: bcrB.right,
              width: bcrB.right - bcrA.left,
              // no changes since they are all the same
              height: bottom - top,
              top,
              bottom,
            });
            // console.log('ffff');
            // todo: is this inefficient? maybe there's a better way to continue w/o starting over?
            return mergeTouchingBCRs(bcrs);
          }
        }
      }
    }

    for (let i =0; i<bcrs.length; i++) {
      for (let j = 0; j<bcrs.length; j++) {
        if (i === j) {
          continue;
        }
        const bcrA = bcrs[i];
        const bcrB = bcrs[j];
        if (almostEqual(bcrA.left, bcrB.left) || almostEqual(bcrA.right, bcrB.right)) {
          // console.log('line up', bcrA.right, bcrB.left);
          // they line up horizontally
          if (bcrB.bottom >= bcrB.bottom && bcrB.top >= bcrA.top) {
            bcrs.splice(i, 1);
            if (i<j) {
              j--; // update index after delete
            }
            bcrs.splice(j, 1);
            const left = Math.min(bcrA.left, bcrB.left);
            const right = Math.max(bcrA.right, bcrB.right);

            bcrs.push({
              left,
              right,
              width: right - left,
              height: bcrB.bottom - bcrA.top,
              top: bcrA.top,
              bottom: bcrB.bottom,
            });
            // console.log('ffff');
            // todo: is this inefficient? maybe there's a better way to continue w/o starting over?
            return mergeTouchingBCRs(bcrs);
          }
        }
      }
    }

    return bcrs;
  }





  // todo: check this works, mayb write test case
  function bcrContains(bcr1, bcr2) {
    const topLeft = {
      x: bcr2.left,
      y: bcr2.top,
    };
    const topRight = {
      x: bcr2.right,
      y: bcr2.top,
    };
    const bottomLeft = {
      x: bcr2.left,
      y: bcr2.bottom,
    };
    const bottomRight = {
      x: bcr2.right,
      y: bcr2.bottom,
    };
    return (
      bcrContainsPoint(bcr1, topLeft) &&
      bcrContainsPoint(bcr1, topRight) &&
      bcrContainsPoint(bcr1, bottomLeft) &&
      bcrContainsPoint(bcr1, bottomRight)
    );
  }

  function bcrContainsPoint(bcr, {x, y}) {
  //   console.log(
  //     'contains',
  //     bcr,
  //     x,``
  //     y,
  //     bcr.left <= x && bcr.right <= x && bcr.top <= y && bcr.bottom >= y,
  //     [bcr.left <= x, bcr.right >= x, bcr.top <= y, bcr.bottom >= y]
  //   );
    return bcr.left <= x && bcr.right >= x && bcr.top <= y && bcr.bottom >= y;
  }

  var tapTargets =(function() {
        function getElementsInDocument(selector) {
    /** @type {Array<Element>} */
    const results = [];

    /** @param {NodeListOf<Element>} nodes */
    const _findAllElements = nodes => {
      for (let i = 0, el; el = nodes[i]; ++i) {
        if (!selector || el.matches(selector)) {
          results.push(el);
        }
        // If the element has a shadow root, dig deeper.
        if (el.shadowRoot) {
          _findAllElements(el.shadowRoot.querySelectorAll('*'));
        }
      }
    };
    _findAllElements(document.querySelectorAll('*'));

    return results;
  };
        
   
        function checkParent(node, bcrs) {
      const parent = node.parentElement
      if (getComputedStyle(parent).overflow !== "visible") {
         for (var i=0;i<bcrs.length;i++) {
             var bcr = bcrs[i]
             if (!bcrContains(parent.getBoundingClientRect(), bcr)) {
                return false
             }
         }
      }
  //     console.log(parent.parentElement.tagName);
      if (parent.parentElement && parent.parentElement.tagName !== "HTML") {
         return checkParent(parent.parentElement, bcrs)
      }
      return true
  }
  /**
   * @param {Element} node
   */
  function isVisible({node, rec, bcrs = getBCRs(node, false)}) {
    const {
      overflowX,
      overflowY,
      display,
      opacity,
      visibility,
    } = getComputedStyle(node);

    if (
      ((overflowX === 'hidden' && overflowY === 'hidden') ||
        node.children.length === 0) &&
      allBCRsEmpty(bcrs)
    ) {
      return false;
    }

    if (
      display === 'none' ||
      visibility === 'hidden' ||
      visibility === 'collapse' ||
      parseFloat(opacity) < 0.1
    ) {
      return false;
    }

    if (display === 'block' || display === 'inline-block') {
      if (node.clientWidth === 0 && overflowX === 'hidden') {
        return false;
      }
      if (node.clientHeight === 0 && overflowY === 'hidden') {
        return false;
      }
    }

    const parent = node.parentElement;


  if (!rec && !checkParent(node, bcrs)) {
     console.log("not visible b/c parent", node)
    return false
  }

    if (parent && parent.nodeName !== 'HTML' && !isVisible({node: parent, rec: true})) {
      return false;
    }



    return true;
  }
    window.iv = isVisible
    
    
        


  function getBCRs(node, includeChildren = true) {
    const {display, overflowX, overflowY} = getComputedStyle(node);

    let bcrs;

    // if (display === 'inline' && overflowX === 'visible' && overflowY === 'visible') {
    //   const range = document.createRange();
    //   range.selectNodeContents(node);

    //   bcrs = range.getClientRects();
    // } else {
    bcrs = node.getClientRects();
    bcrs = Array.from(bcrs).map(bcr => {
      const {width, height, left, top, right, bottom} = bcr;
      return {width, height, left, top, right, bottom};
    });
    if (includeChildren) {
      for (const child of node.children) {
        getBCRs(child).forEach(childBcr => bcrs.push(childBcr));
      }
    }
    // }
    

    return bcrs;
  }









        function allBCRsEmpty(bcrs) {
    return bcrs.length === 0 || bcrs.every(bcr => bcr.width === 0 && bcr.height === 0);
  };
        function getOuterHTMLSnippet(element, ignoreAttrs=[]) {
    const clone = element.cloneNode();

    ignoreAttrs.forEach(attribute =>{
      clone.removeAttribute(attribute);
    });

    const reOpeningTag = /^[\s\S]*?>/;
    const match = clone.outerHTML.match(reOpeningTag);

    return (match && match[0]) || '';
  };
        
        // for testing
        document.documentElement.scrollTop = 0
        // todo: move this code out of there and run toString on the function
        // migth need stuff like this: // @ts-ignore - getOuterHTMLSnippet put into scope via stringification

        const selector = 'button,a,input,textarea,select,option,[role=button],[role=checkbox],[role=link],[role=menuitem],[role=menuitemcheckbox],[role=menuitemradio],[role=option],[role=scrollbar],[role=slider],[role=spinbutton]';
        // const elements = getElementsInDocument(selector);

        function collect() {
          return Array.from(document.querySelectorAll(selector))
      }

        const allTargets = collect()

  //         .filter(node => node.classList.contains("-time"))
          .map(node => { /*debugger;*/ return ({
              node,
              bcrs: getBCRs(node),
              tagName: node.tagName,
              snippet: node.outerHTML,
              href: node.getAttribute("href"),
              getNode: () => node
          }) });

        console.time('isVisible');
        let visibleTargets = allTargets.filter(isVisible);
        console.timeEnd('isVisible');


       function isInline(node) {
        if (!node) {
           return false
        }
        if (node.nodeType === Node.TEXT_NODE) {
          return true
        }
        if (node.nodeType !== Node.ELEMENT_NODE) {
          return false
        }
        return getComputedStyle(node).display === "inline" || getComputedStyle(node).display === "inline-block" 
      }

      function isTextNode(node) {
        return node.nodeType === Node.TEXT_NODE
      }
  function hasTextNodeSiblingsWithContent(node) {
      if (!node.parentElement) {
        return false;
      }

      const potentialSiblings = node.parentElement.childNodes;
      for (let i = 0; i < potentialSiblings.length; i++) {
        const sibling = potentialSiblings[i];
        if (sibling === node) {
          continue;
        }
        // check for at least 3 chars so e.g. " | " doesn't count as content
        if (sibling.nodeType === Node.TEXT_NODE && sibling.textContent && sibling.textContent.trim().length > 3) {
          return true;
        }
      }

      return false;
    }

      function nodeIsInTextBlock(node) {
        if (!isInline(node)) {
          return false
        }
        
        if (!node.nextSibling && !node.previousSibling) {
          return nodeIsInTextBlock(node.parentElement)
        }
  //       return hasTextNodeSiblingsWithContent(node)
        if (hasTextNodeSiblingsWithContent(node)) {

          return true
        } else {
          return nodeIsInTextBlock(node.parentElement)
        }
        
  //       return  isInline(node.nextSibling) || isInline(node.previousSibling)
      }
      
        visibleTargets =  visibleTargets.filter(target => {

          const isBlock = nodeIsInTextBlock(target.node)
          if (isBlock) {
             target.node.style.outline = "1px solid #aaa";
          }

          return !isBlock
        })


        visibleTargets.forEach(target=> target.node = null)

        console.log(visibleTargets.length)
        return visibleTargets
      })()




  /**
   * @see https://math.stackexchange.com/questions/99565/simplest-way-to-calculate-the-intersect-area-of-two-rectangles
   * @param {{left: number, right: number, top: number, bottom: number}} bcrA
   * @param {{left: number, right: number, top: number, bottom: number}} bcrB
   * @returns {number}
   */
  function getOverlapDistanceBetweenRectangles(bcrA, bcrB) {// todo: Maybe ranme this fn
    const xOverlap = Math.max(0, Math.min(bcrA.right, bcrB.right) - Math.max(bcrA.left, bcrB.left));
    const yOverlap = Math.max(0, Math.min(bcrA.bottom, bcrB.bottom) - Math.max(bcrA.top, bcrB.top));

    // todo: is this if statement needed?? (maybe negative distances? dont think that can happen)
    if (xOverlap === 0 || yOverlap === 0) {
      return 0;
    }
    // We care about the minimum distance the user can move the two tap targets to fix the issue

    return Math.min(xOverlap, yOverlap);
  }

  function getFingerAtCenter(bcr) {
    return {
      left: bcr.left + bcr.width / 2 - FINGER_SIZE_PX / 2,
      top: bcr.top + bcr.height / 2 - FINGER_SIZE_PX / 2,
      right: bcr.right - bcr.width / 2 + FINGER_SIZE_PX / 2,
      bottom: bcr.bottom - bcr.height / 2 + FINGER_SIZE_PX / 2,
    };
  }

  /**
   *
   * @param {LH.Artifacts.TapTarget[]} targets
   */

  function tooCloseTargets(targets) {
    const count = targets.length;
    
    const failures = [];

    const tapTargetsWithFailures = new Set();


    function hasFailure(targetA, targetB) {
      return failures.some(failure => {
        return failure.targetA === targetA && failure.targetB === targetB;
      });
    }

    for (let i = 0; i < count; i++) {
      for (let j = 0; j < count; j++) {
        if (i === j) {
          continue;
        }

        const targetA = targets[i];
        const targetB = targets[j];
        if (/https?\:\/\//.test(targetA.href) && targetA.href === targetB.href) {
           // no overlap because same target action
           console.log("same target", targetA, targetB)
           continue;
        }

        if (hasFailure(targetB, targetA)) {
          // console.log('already has failure', {i, j});
          continue;
        }

        let maxOverlap = 0;

        let fail = false
        
   function getRectOverlap(rect1, rect2){
       https://stackoverflow.com/a/9325084/1290545
         return  Math.max(0, Math.min(rect1.right, rect2.right) - Math.max(rect1.left, rect2.left)) * Math.max(0, Math.min(rect1.bottom, rect2.bottom) - Math.max(rect1.top, rect2.top))
   
        }
        
        function getFingerQuadrants(bcr) {

            return [{
              left: bcr.left + bcr.width / 2 - FINGER_SIZE_PX / 2,
              top: bcr.top + bcr.height / 2 - FINGER_SIZE_PX / 2,
              right: bcr.right - bcr.width / 2,
              bottom: bcr.bottom - bcr.height / 2,
            },{
              left: bcr.left + bcr.width / 2,
              top: bcr.top + bcr.height / 2 - FINGER_SIZE_PX / 2,
              right: bcr.right - bcr.width / 2 + FINGER_SIZE_PX / 2,
              bottom: bcr.bottom - bcr.height / 2,
            },{
              left: bcr.left + bcr.width / 2 - FINGER_SIZE_PX / 2,
              top: bcr.top + bcr.height / 2,
              right: bcr.right - bcr.width / 2,
              bottom: bcr.bottom - bcr.height / 2 + FINGER_SIZE_PX / 2,
            },{
              left: bcr.left + bcr.width / 2,
              top: bcr.top + bcr.height / 2,
              right: bcr.right - bcr.width / 2 + FINGER_SIZE_PX / 2,
              bottom: bcr.bottom - bcr.height / 2 + FINGER_SIZE_PX / 2,
            }]

        }
        
        function getFingerScore(rectWithFinger, scoredRect) {
          var q = getFingerQuadrants(rectWithFinger)
          
          var maxScore = 0
          q.forEach(finger => {
            var score = getRectOverlap(finger, scoredRect);
            // console.log({score})
            if (score > maxScore) {
              maxScore = score
            }

           if (checkOverlapBetweenFingers && rectWithFinger !== scoredRect) {
             
                  var score = getRectOverlap(finger, getFingerAtCenter(scoredRect));
                  // console.log({score})
                  if (score > maxScore) {

                    maxScore = score
                  }
              
            }
           });
          
          return maxScore
          
        }
        
        
        
        
        simplifyBCRs(targetA.bcrs).forEach(bcrA => {
          const fingerAtCenter = getFingerAtCenter(bcrA);
          const aOverlapScore = getFingerScore(bcrA, bcrA)
  //         console.log(targetA.node, {aOverlapScore})
          bcrA.fingerAtCenter = fingerAtCenter;

          for (let bcrBB of targetB.bcrs) {
            if (bcrContains(bcrBB, bcrA)) {
              return
            }
          }

          targetB.bcrs.forEach(bcrB => {
            for (let bcrAA of targetA.bcrs) {
              if (bcrContains(bcrAA, bcrB)) {
                return
              }
            }

            bcrB.fingerAtCenter = getFingerAtCenter(bcrB);
            const bOverlapScore = getFingerScore(bcrA, bcrB)
            let overlap = getOverlapDistanceBetweenRectangles(fingerAtCenter, bcrB);
  //           console.log(targetB.node, {bOverlapScore})
            
  //           console.log({aOverlapScore, bOverlapScore, bad: bOverlapScore > aOverlapScore / 2})
            

            // console.log(fingerAtCenter, bcrB);

            if (overlap > maxOverlap) {
              maxOverlap = overlap;
            }

            if (checkOverlapBetweenFingers) {
              overlap = getOverlapDistanceBetweenRectangles(fingerAtCenter, getFingerAtCenter(bcrB));
              if (overlap > maxOverlap) {
                maxOverlap = overlap;
              }
            }


            if (scoreBasedOnOverlapArea) {
              if (bOverlapScore > aOverlapScore / 2) {
                fail = true
              }

            } else {
              if (maxOverlap > 0) {
                fail = true
              }
            }

          });
        });

        // console.log({maxOverlap, a: targetA.snippet, b: targetB.snippet});

        
        if (fail) {
          tapTargetsWithFailures.add(targetA);
  //         tapTargetsWithFailures.add(targetB);
          failures.push({
            targetA,
            targetB,
            overlap: 1234,
          });
        }
        
  //       if (maxOverlap > 0) {

  //         tapTargetsWithFailures.add(targetA);
  //         tapTargetsWithFailures.add(targetB);
  //         failures.push({
  //           targetA,
  //           targetB,
  //           overlap: maxOverlap,
  //         });
  //       }
      }
    }

    
    return {
      failingTapTargetsCount: tapTargetsWithFailures.size,
      failures,
    };
  }

  var artifacts = {TapTargets: tapTargets}

        console.time('tooCloseTargets');
      var ttt = tooCloseTargets(artifacts.TapTargets);
      var tooClose = ttt.failures;
      var failingTapTargetsCount = ttt.failingTapTargetsCount;
      console.timeEnd('tooCloseTargets');
      /** @type {Array<{node: LH.Audit.DetailsRendererNodeDetailsJSON, issue: string}>} */
      var failures = [];

      console.time('tooCloseTargets output');
      tooClose.forEach(({targetA, targetB, overlap}) => {
        failures.push({
          targetA: {type: 'node', snippet: targetA.snippet, __debug: targetA},
          targetB: {type: 'node', snippet: targetB.snippet, __debug: targetB},
          issue:
            `${Math.floor(overlap)}px`,
        });
      });

      var headings = [
        {key: 'targetA', itemType: 'node', text: 'Element 1'},
        {key: 'targetB', itemType: 'node', text: 'Element 2'},
        {key: 'issue', itemType: 'text', text: 'Extra Distance Needed'},
      ];

      
      console.time('tooCloseTargets output');
      var displayValue;

      if (failures.length) {
        displayValue = failures.length > 1 ?
          `${failures.length} issues found` : '1 issue found';
      }

      var score;
      if (artifacts.TapTargets.length > 0) {
        score = 1 - (failingTapTargetsCount / artifacts.TapTargets.length);
      } else {
        score= 1;
      }







       function drawFinger(bcr, debugInfo) {
          const point = document.createElement('div');
          point.style.position = 'absolute';
          point.style.left = bcr.left + 'px';
          point.style.top = bcr.top + 'px';
          point.style.width = (bcr.right - bcr.left) + "px";
          point.style.height = (bcr.bottom - bcr.top) + "px";
          point.style.background = "rgba(0,0,255,0.2)";
          point.style.zIndex = "1000000000";
          point.setAttribute("finger", "f")
          point.setAttribute("debugInfo", JSON.stringify(debugInfo).slice(0, 500))
          point.refNode = debugInfo.getNode()
          document.body.appendChild(point);
      }
      function drawContainer(bcr, color, debugInfo) {
          debugInfo.getNode().style.outline = "2px solid " + color
  //         debugInfo.getNode().setAttribute("debugInfo", JSON.stringify(debugInfo))
  //         const point = document.createElement('div');
  //         point.style.position = 'absolute';
  //         point.style.left = bcr.left + 'px';
  //         point.style.top = bcr.top + 'px';
  //         point.style.width = (bcr.right - bcr.left) + "px";
  //         point.style.height = (bcr.bottom - bcr.top) + "px";
  //         point.style.background = color;
  //         point.style.zIndex = "1000000000";
  //         point.setAttribute("tapTarget", "t")
  //         point.setAttribute("debugInfo", JSON.stringify(debugInfo))
  //         document.body.appendChild(point);
      }
      
       





      var res = {
      score,
      failures,
      tapTargets: artifacts.TapTargets,
    }
      
      Array.from(document.querySelectorAll("[finger]")).forEach(el => el.remove());
      Array.from(document.querySelectorAll("[tapTarget]")).forEach(el => el.remove());
      res.tapTargets.forEach(tapTarget => {
          simplifyBCRs(tapTarget.bcrs).forEach(bcr => {
              drawFinger(getFingerAtCenter(bcr), tapTarget)
              drawContainer(bcr, "rgba(0,255,0,1)", tapTarget)
          })
      })
      res.failures.forEach((failure) => {
         
         failure.targetA.__debug.bcrs.forEach(bcr => drawContainer(bcr, "rgba(255,0,0,1)", failure.targetA.__debug));
         failure.targetB.__debug.bcrs.forEach(bcr => drawContainer(bcr, "rgba(255,120,0,1)", failure.targetB.__debug));
      })

      var div = document.createElement("div")
  div.style="position: absolute; top: 200px; width: 110px; right: 0;z-index: 102222000001;padding: 5px;background: red;color:white;"
  div.innerHTML = `Score: ${Math.round(res.score* 100)}%<br> Targets: ${res.tapTargets.length}<br> WithFailures: ${failingTapTargetsCount}<br>Failures: ${res.failures.length}`

  document.body.appendChild(div)

  console.log(tapTargets)
}